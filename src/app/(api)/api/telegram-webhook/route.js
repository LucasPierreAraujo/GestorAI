// app/api/telegram-webhook/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Gera token interno para autenticar a API /api/chat
function getInternalToken() {
  const internalPayload = {
    id: 'external-telegram-user-id',
    email: 'webhook@gestoai.com',
    nomeCompleto: 'Telegram Webhook'
  };
  return jwt.sign(internalPayload, process.env.JWT_SECRET, { expiresIn: '5m' });
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Captura mensagem
    const incomingMessage =
      body?.message?.text ||
      body?.callback_query?.data ||
      '';

    if (!incomingMessage) {
      console.error('Mensagem ausente no payload:', body);
      return NextResponse.json({ error: 'Mensagem ausente' }, { status: 400 });
    }

    // Captura chatId
    const chatId =
      body?.message?.chat?.id ||
      body?.callback_query?.message?.chat?.id ||
      null;

    if (!chatId) {
      console.error('Não foi possível capturar chatId:', body);
      return NextResponse.json({ error: 'chatId ausente' }, { status: 400 });
    }

    // Gera token interno
    const internalToken = getInternalToken();

    // Chama a API interna de chat
    const chatResponse = await fetch(new URL('/api/chat', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${internalToken}`,
      },
      body: JSON.stringify({ message: incomingMessage }),
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('Erro na API interna de chat:', errorText);
      return NextResponse.json({ error: 'Falha na API interna' }, { status: 500 });
    }

    const result = await chatResponse.json();
    const assistantResponse = result.response || 'Não houve resposta da API de chat.';

    // Envia resposta de volta para o Telegram
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
