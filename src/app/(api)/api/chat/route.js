const messages = await prisma.chatMessage.findMany({
  where: { conversationId },
  orderBy: { createdAt: 'asc' },
});

const chatMessages = messages.map(msg => ({
  role: msg.sender === 'user' ? 'user' : 'assistant',
  content: msg.text,
}));

// Adiciona instrução do sistema
chatMessages.unshift({
  role: 'system',
  content: 'Você é um assistente virtual inteligente que ajuda a organizar tarefas e responder dúvidas.'
});

// Envia para Groq
const chatCompletion = await groq.chat.completions.create({
  model: 'openai/gpt-oss-20b',
  messages: chatMessages,
});
