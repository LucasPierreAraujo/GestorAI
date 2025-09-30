// app/api/telegram-webhook/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '../../../../lib/prisma';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Gera token interno para autenticar /api/chat
function getInternalToken() {
  const internalPayload = {
    id: 'external-telegram-user-id',
    email: 'webhook@gestoai.com',
    nomeCompleto: 'Telegram Webhook'
  };
  return jwt.sign(internalPayload, process.env.JWT_SECRET, { expiresIn: '5m' });
}

// -------------------------------------------------------------
// CORREÇÃO PARA HTTP ERROR 405
// Permite que o Vercel retorne 200 OK (ou 405) para requisições GET
// (que são as que o navegador envia ao acessar a URL).
//
// Embora um webhook só deva receber POST, Vercel/Next.js exige que
// a função GET esteja presente para evitar 405 para requisições
// não tratadas.
// -------------------------------------------------------------
export async function GET() {
  // Retorna 200 OK e uma mensagem indicando que é um webhook
  // Opcionalmente, pode retornar 405, mas 200 é mais amigável para verificação.
  return NextResponse.json({ message: 'Este é o endpoint do Webhook do Telegram. Por favor, envie uma requisição POST.' }, { status: 200 });
}
// -------------------------------------------------------------


export async function POST(request) {
  try {
    const body = await request.json();

    const incomingMessage =
      body?.message?.text ||
      body?.callback_query?.data ||
      '';

    if (!incomingMessage) {
      console.error('Mensagem ausente no payload:', body);
      return NextResponse.json({ error: 'Mensagem ausente' }, { status: 400 });
    }

    const chatId =
      body?.message?.chat?.id ||
      body?.callback_query?.message?.chat?.id ||
      null;

    if (!chatId) {
      console.error('Não foi possível capturar chatId:', body);
      return NextResponse.json({ error: 'chatId ausente' }, { status: 400 });
    }

    // Busca usuário pelo chatId (ou cria usuário temporário)
    let user = await prisma.user.findUnique({ where: { email: `${chatId}@telegram.local` } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: `${chatId}@telegram.local`,
          senha: 'temporal', // senha dummy
          nomeCompleto: `Usuário Telegram ${chatId}`
        },
      });
    }

    // Busca ou cria uma conversa ativa para o usuário
    let conversation = await prisma.conversation.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          summary: 'Conversa inicial',
          userId: user.id,
        },
      });
    }

    // Salva a mensagem do usuário
    await prisma.chatMessage.create({
      data: {
        text: incomingMessage,
        sender: 'user',
        conversationId: conversation.id,
      },
    });

    // Busca histórico da conversa
    const messages = await prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });

    // Monta prompt para enviar para a API interna
    const prompt = messages
      .map(msg => (msg.sender === 'user' ? `User: ${msg.text}` : `Assistant: ${msg.text}`))
      .join('\n');

    // Chama API interna /api/chat
    const internalToken = getInternalToken();

    const chatResponse = await fetch(new URL('/api/chat', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${internalToken}`,
      },
      body: JSON.stringify({ message: prompt }),
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('Erro na API interna de chat:', errorText);
      return NextResponse.json({ error: 'Falha na API interna' }, { status: 500 });
    }

    const result = await chatResponse.json();
    const assistantResponse = result.response || 'Não houve resposta da API de chat.';

    // Salva a resposta do bot
    await prisma.chatMessage.create({
      data: {
        text: assistantResponse,
        sender: 'assistant',
        conversationId: conversation.id,
      },
    });

    // Envia resposta para o Telegram
    const telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: assistantResponse,
      }),
    });

    if (!telegramResponse.ok) {
      const errorText = await telegramResponse.text();
      console.error('Erro ao enviar mensagem para Telegram:', errorText);
      return NextResponse.json({ error: 'Falha ao enviar mensagem para Telegram' }, { status: 500 });
    }

    return NextResponse.json({ chatId, response: assistantResponse }, { status: 200 });

  } catch (error) {
    console.error('Erro no webhook do Telegram:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}