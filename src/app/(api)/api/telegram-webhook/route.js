
// app/api/telegram-webhook/route.js

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// Função para gerar token interno
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

    // Captura mensagem de diferentes cenários
    const incomingMessage =
      body?.message?.text ||
      body?.text ||
      (typeof body?.message === 'string' ? body.message : '') ||
      body?.callback_query?.data ||
      '';

    // Captura chatId de diferentes tipos de payload
    const chatId =
      body?.message?.chat?.id ||
      body?.chat_id ||
      body?.fromNumber ||
      body?.callback_query?.from?.id ||
      '1376992445'; // fallback

    if (!incomingMessage) {
      console.error('Payload inválido recebido:', body);
      return NextResponse.json(
        { error: 'Payload inválido: mensagem ausente.' },
        { status: 400 }
      );
    }

    const internalToken = getInternalToken();

    // Chamada à API de chat interna
    const response = await fetch(new URL('/api/chat', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${internalToken}`,
      },
      body: JSON.stringify({ message: incomingMessage, chatId }),
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      console.error('Erro detalhado da API de chat:', errorDetails);
      return NextResponse.json(
        { error: 'Falha interna na API de Chat.' },
        { status: 500 }
      );
    }

    const result = await response.json();
    const assistantResponse = result.response;

    return NextResponse.json(
      {
        response: assistantResponse,
        chatId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro no webhook do Telegram:', error.message);
    return NextResponse.json(
      { error: `Erro ao processar mensagem: ${error.message}` },
      { status: 500 }
    );
  }
}