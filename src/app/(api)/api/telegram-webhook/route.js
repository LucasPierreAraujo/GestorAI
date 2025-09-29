// app/api/telegram-webhook/route.js

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

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
  const body = await request.json(); 

  // Mensagem recebida (aceita string direta, Telegram ou text)
  const incomingMessage =
    typeof body.message === 'string' ? body.message : body.message?.text || body.text || '';
  
  // ID do chat ou fallback para fromNumber ou seu número
  const chatId = body.message?.chat?.id || body.chat_id || body.fromNumber || '5588996704089';
  
  if (!incomingMessage) {
    console.error('Payload inválido recebido:', body);
    return NextResponse.json({ error: 'Payload inválido: mensagem ausente.' }, { status: 400 });
  }

  const internalToken = getInternalToken(); 

  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${internalToken}`, 
      },
      body: JSON.stringify({ message: incomingMessage, chatId }),
    });

    if (!response.ok) {
        const errorDetails = await response.text();
        console.error('Erro detalhado da API de chat:', errorDetails);
        return NextResponse.json({ error: 'Falha interna na API de Chat.' }, { status: 500 });
    }
    
    const result = await response.json();
    const assistantResponse = result.response;

    return NextResponse.json({
      response: assistantResponse,
      chatId: chatId,
    }, { status: 200 });

  } catch (error) {
    console.error('Erro no webhook do Telegram:', error.message);
    return NextResponse.json({ 
        error: `Erro ao processar mensagem: ${error.message}` 
    }, { status: 500 });
  }
}

