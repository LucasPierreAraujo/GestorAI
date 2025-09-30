// app/api/telegram-webhook/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '../../../../lib/prisma';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const INTERNAL_USER_EMAIL = 'webhook@gestoai.com';

// Gera token interno para autenticar /api/chat
function getInternalToken() {
  const internalPayload = {
    id: 'external-telegram-user-id',
    email: INTERNAL_USER_EMAIL,
    nomeCompleto: 'Telegram Webhook'
  };
  return jwt.sign(internalPayload, process.env.JWT_SECRET, { expiresIn: '5m' });
}

// Rota GET para evitar erros 405 (Verificação do Vercel)
export async function GET() {
  return NextResponse.json({ message: 'Este é o endpoint do Webhook do Telegram. Por favor, envie uma requisição POST.' }, { status: 200 });
}

export async function POST(request) {
  // ADICIONANDO LOG PARA VERIFICAR SE O ARQUIVO ESTÁ RECARREGADO
  console.log("--- WEBHOOK INICIADO (VERSÃO DEBUG) ---"); 

  try {
    const body = await request.json();

    const incomingMessage =
      body?.message?.text ||
      body?.callback_query?.data ||
      '';

    const chatId =
      body?.message?.chat?.id ||
      body?.callback_query?.message?.chat?.id ||
      null;

    if (!incomingMessage || !chatId) {
      console.error('Mensagem ou chatId ausente no payload.');
      return NextResponse.json({ error: 'Mensagem ou chatId ausente' }, { status: 400 });
    }

    // 1. Busca ou cria usuário temporário
    const userEmail = `${chatId}@telegram.local`;
    let user = await prisma.user.findUnique({ where: { email: userEmail } });
    
    if (!user) {
      // Usando uma senha dummy (a rota login/register exige senha)
      const senhaDummy = 'temporal' + Math.random().toString(36).substring(2, 15); 
      user = await prisma.user.create({
        data: {
          email: userEmail,
          senha: senhaDummy, 
          nomeCompleto: `Usuário Telegram ${chatId}`
        },
      });
      console.log(`Usuário Telegram criado: ${user.id}`);
    }

    // 2. Busca ou cria a última conversa ativa para o usuário
    let conversation = await prisma.conversation.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          summary: 'Conversa inicial (Telegram)', 
          userId: user.id,
        },
      });
      console.log(`Nova conversa criada: ${conversation.id}`);
    }

    // 3. OBTÉM o token interno
    const internalToken = getInternalToken();

    // ==============================================================
    // LOG DE DEBUG DO PAYLOAD
    const payloadToSend = {
        message: incomingMessage,
        conversationId: conversation.id
    };
    console.log("DEBUG PAYLOAD ENVIADO PARA /api/chat:", payloadToSend);
    // ==============================================================
    
    // 4. CHAMA a API interna /api/chat (proxy)
    const chatResponse = await fetch(new URL('/api/chat', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${internalToken}`,
      },
      body: JSON.stringify(payloadToSend), 
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('Erro na API interna de chat:', errorText);

      // Envia notificação de erro para o Telegram
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `❌ Erro ao processar: ${errorText.substring(0, 100)}`,
        }),
      });
      return NextResponse.json({ error: 'Falha na API interna' }, { status: 500 });
    }

    const result = await chatResponse.json();
    const assistantResponse = result.response || 'Não houve resposta da API de chat.';

    // 5. Envia resposta da IA para o Telegram
    const telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: assistantResponse,
      }),
    });

    if (!telegramResponse.ok) {
      console.error('Erro ao enviar mensagem para Telegram:', await telegramResponse.text());
      return NextResponse.json({ error: 'Falha ao enviar mensagem para Telegram' }, { status: 500 });
    }

    return NextResponse.json({ chatId, response: assistantResponse }, { status: 200 });

  } catch (error) {
    console.error('Erro no webhook do Telegram:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}