import prisma from '@/lib/prisma';
import Groq from 'groq-sdk';
import { NextResponse } from 'next/server'; // Importe NextResponse para usar na função GET

// Inicializa o cliente Groq. Ele lerá a GROQ_API_KEY do seu .env
const groq = new Groq();

// -----------------------------------------------------------------
// CORREÇÃO PARA HTTP ERROR 405 (GET)
// Informa ao servidor que GET não é suportado e retorna uma mensagem.
// -----------------------------------------------------------------
export async function GET() {
  return NextResponse.json(
    { message: 'Rota de chat aceita apenas requisições POST.' }, 
    { status: 405 }
  );
}

// Função que lida com a requisição POST (Lógica principal do chat)
export async function POST(req) {
  
  // O App Router usa req.json() para obter o corpo da requisição
  const { conversationId, userMessage } = await req.json();

  if (!conversationId || !userMessage) {
    return new Response(
      JSON.stringify({ message: 'Faltando conversationId ou userMessage.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 1. SALVAR a mensagem do usuário no banco (Supabase via Prisma)
    await prisma.chatMessage.create({
      data: {
        conversationId: conversationId,
        text: userMessage,
        sender: 'user', 
      },
    });

    // 2. BUSCAR HISTÓRICO da conversa no Supabase
    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    // 3. FORMATAR MENSAGENS para a API do Groq
    const chatMessages = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text,
    }));

    // Adiciona instrução do sistema (Contexto para a IA)
    chatMessages.unshift({
      role: 'system',
      content: 'Você é um assistente virtual inteligente que ajuda a organizar tarefas e responder dúvidas.'
    });

    // 4. ENVIAR para Groq
    // 🚨 AVISO: O modelo 'openai/gpt-oss-20b' provavelmente não é um modelo Groq.
    // Sugestão: Use um modelo nativo Groq, como 'mixtral-8x7b-32768' ou 'llama3-8b-8192'.
    const chatCompletion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b', // Modelo Groq nativo
      messages: chatMessages,
    });
    
    // Extrai a resposta da IA
    const assistantResponse = chatCompletion.choices[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';

    // 5. SALVAR a resposta da IA no banco
    await prisma.chatMessage.create({
      data: {
        conversationId: conversationId,
        text: assistantResponse,
        sender: 'assistant', 
      },
    });

    // 6. RETORNAR a resposta para o frontend
    return new Response(
      JSON.stringify({ response: assistantResponse }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na rota de chat:', error);
    return new Response(
      JSON.stringify({ message: 'Ocorreu um erro interno no servidor.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}