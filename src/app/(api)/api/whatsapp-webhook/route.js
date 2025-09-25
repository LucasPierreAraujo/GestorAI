import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

// 1. JWT NÃO É VERIFICADO NO WEBSERVER: Esta rota NÃO deve verificar o JWT, pois ela recebe o payload do n8n.
// Em vez disso, ela deve forçar a autenticação de forma interna. 
// A verificação de segurança é feita no n8n (com uma chave secreta do webhook) e na rota de chat.

// Função placeholder para simular um usuário autenticado internamente
function getInternalToken() {
    // Para simplificar, o token é gerado com um usuário 'webhook' de teste
    // Isso BURLA a necessidade de um login completo e permite que o webhook chame a rota protegida.
    const internalPayload = { 
        id: 'external-webhook-user-id', 
        email: 'webhook@gestoai.com', 
        nomeCompleto: 'WhatsApp Webhook'
    };
    return jwt.sign(internalPayload, process.env.JWT_SECRET, { expiresIn: '5m' });
}

export async function POST(request) {
  // NOTA: Para um ambiente de produção, este webhook deve ser protegido com uma chave de API
  // secreta que o n8n envia, em vez de um JWT. 
  
  const { message, fromNumber } = await request.json(); // Pega a mensagem e o número do n8n

  // FIX: Gera um token de uso único e interno para autenticar na rota protegida /api/chat
  const internalToken = getInternalToken(); 

  try {
    // 1. Faz uma requisição para a sua API de chat (rota protegida)
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // O FIX AQUI: Injeta o token interno no cabeçalho
        'Authorization': `Bearer ${internalToken}`, 
      },
      body: JSON.stringify({ message: message }),
    });

    if (!response.ok) {
        // Se a API de chat falhar, captura o erro e retorna um erro 500
        const errorDetails = await response.text();
        console.error('Erro detalhado da API de chat:', errorDetails);
        throw new Error('A API de chat retornou um erro, veja o log para detalhes.');
    }
    
    const result = await response.json();
    const assistantResponse = result.response;

    // 2. Retorna a resposta para o n8n
    return NextResponse.json({
      response: assistantResponse,
      to: fromNumber,
    }, { status: 200 });

  } catch (error) {
    console.error('Erro no webhook do WhatsApp:', error.message);
    return NextResponse.json({ 
        error: `Erro ao processar mensagem: ${error.message}` 
    }, { status: 500 });
  }
}