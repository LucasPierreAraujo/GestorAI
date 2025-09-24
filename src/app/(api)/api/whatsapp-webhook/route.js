// app/api/whatsapp-webhook/route.js

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

// Função para verificar o token JWT
function verificarToken(request) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token) return { error: 'Token não fornecido.', status: 401 };

  try {
    const usuario = jwt.verify(token, process.env.JWT_SECRET);
    return { usuario, status: 200 };
  } catch (error) {
    return { error: 'Token inválido.', status: 401 };
  }
}

export async function POST(request) {
  const verificacao = verificarToken(request);
  if (verificacao.status !== 200) {
    return NextResponse.json({ error: verificacao.error }, { status: verificacao.status });
  }
  
  const { id: userId } = verificacao.usuario;
  const { message, fromNumber } = await request.json(); // Pega a mensagem e o número do n8n

  try {
    // 1. Faz uma requisição para a sua API de chat
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${verificacao.token}`, // Reutiliza o token
      },
      body: JSON.stringify({ message: message }),
    });

    if (!response.ok) throw new Error('Erro na comunicação com a API de chat.');
    
    const result = await response.json();
    const assistantResponse = result.response;

    // 2. Retorna a resposta para o n8n
    return NextResponse.json({
      response: assistantResponse,
      to: fromNumber,
    }, { status: 200 });

  } catch (error) {
    console.error('Erro no webhook do WhatsApp:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}