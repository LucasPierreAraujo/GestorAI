'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import jwt from 'jsonwebtoken';

const capitalizeName = (name) => {
  if (!name) return '';
  return name.split(' ').map(word => {
    if (word.length === 0) return '';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const router = useRouter();
  const chatEndRef = useRef(null);

  useEffect(() => {
    const checkAuth = () => {
      const tokenCookie = document.cookie.split(';').find(row => row.trim().startsWith('token='));
      if (!tokenCookie) {
        router.push('/auth/login');
      } else {
        const token = tokenCookie.split('=')[1];
        try {
          const decodedUser = jwt.decode(token);
          if (decodedUser) {
            setUser(decodedUser);
            setLoading(false);
          } else {
            router.push('/auth/login');
          }
        } catch (error) {
          router.push('/auth/login');
        }
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const handleLogout = () => {
    document.cookie = 'token=; Max-Age=0; path=/;';
    router.push('/auth/login');
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;
    const token = document.cookie.split(';').find(row => row.trim().startsWith('token='))?.split('=')[1];
    
    const newUserMessage = { sender: 'user', text: currentMessage };
    setChatHistory(prevHistory => [...prevHistory, newUserMessage]);
    setCurrentMessage('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: newUserMessage.text }),
      });

      if (!response.ok) throw new Error('Erro na comunicação com o assistente.');
      
      const result = await response.json();
      const assistantResponse = result.response;
      
      setChatHistory(prevHistory => [...prevHistory, { sender: 'assistant', text: assistantResponse }]);

    } catch (error) {
      console.error('Erro no chat:', error);
      alert('Erro ao enviar mensagem: ' + error.message);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const token = document.cookie.split(';').find(row => row.trim().startsWith('token='))?.split('=')[1];
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/import-tasks', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error('Erro ao enviar a planilha.');
      alert('Planilha importada com sucesso!');
    } catch (error) {
      console.error('Erro ao importar planilha:', error);
      alert('Erro ao importar planilha: ' + error.message);
    }
  };

  const handleExport = async () => {
    const token = document.cookie.split(';').find(row => row.trim().startsWith('token='))?.split('=')[1];
    try {
      const response = await fetch('/api/export-tasks', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Erro ao baixar a planilha.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tarefas_exportadas.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      alert('Planilha exportada com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar planilha:', error);
      alert('Erro ao exportar planilha: ' + error.message);
    }
  };

  if (loading) {
    return (<div className="flex items-center justify-center min-h-screen bg-black-basic text-cream">Carregando...</div>);
  }

  return (
    <div className="flex min-h-screen bg-background text-black-basic font-sans">
      <aside className="w-80 bg-primary p-6 flex flex-col justify-between shadow-lg">
        <div>
          <div className="mt-8">
            <h3 className="font-semibold mb-4 text-cream">HISTÓRICO</h3>
            <div className="space-y-2">
              <div className="cursor-pointer p-2 rounded-lg text-cream hover:bg-accent hover:text-white transition duration-200">Ajuda com geração de resp...</div>
              <div className="cursor-pointer p-2 rounded-lg text-cream hover:bg-accent hover:text-white transition duration-200">Ajuda com geração de resp...</div>
              <div className="cursor-pointer p-2 rounded-lg text-cream hover:bg-accent hover:text-white transition duration-200">Ajuda com geração de resp...</div>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col p-8 text-center bg-cream relative">
        <header className="absolute top-0 right-0 p-6">
          <button onClick={handleLogout} className="bg-primary text-cream p-3 rounded-full font-semibold hover:bg-accent transition-colors duration-300 shadow-md">
            <img src="/out.svg" alt="" />
          </button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-between w-full max-w-4xl mx-auto p-4">
          
          {/* Área de conversação */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 bg-black-basic rounded-lg shadow-md w-full mb-8">
            
            {/* Marca d'água da logo */}
            {chatHistory.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10 pointer-events-none z-0">
                <Image 
                  src="/logo.png" 
                  alt="GestoAI Logo" 
                  width={400} 
                  height={400} 
                  priority
                />
                <h1 className="text-3xl font-bold mb-4 text-cream">
                  Olá, {user?.nomeCompleto ? capitalizeName(user.nomeCompleto) : 'Usuário'}!
                </h1>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10">
              {chatHistory.map((msg, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg max-w-[70%] ${msg.sender === 'user' ? 'bg-primary text-cream self-end ml-auto' : 'text-cream self-start'}`}
                >
                  {msg.text}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </div>
          
          {/* Campo de input e botões de ação */}
          <div className="flex flex-col gap-4 w-full relative z-10">
            <div className="flex w-full">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                className="flex-1 p-3 rounded-2xl border border-gray-300 bg-cream text-black-basic"
                placeholder="Descreva aqui o que você precisa para que eu possa ajudá-lo"
              />
              <button
                onClick={handleSendMessage}
                className="p-3 bg-primary text-cream rounded-r-lg hover:bg-accent transition-colors duration-200"
              >
                Enviar
              </button>
            </div>
            
            <div className="flex justify-center space-x-4">
              <input type="file" id="file-input-import" className="hidden" onChange={handleImport} accept=".csv" />
              <div onClick={() => document.getElementById('file-input-import').click()} className="flex flex-col items-center p-4 bg-primary rounded-xl cursor-pointer hover:bg-accent transition duration-200">
                <Image src="/import.svg" alt="Importar" width={32} height={32} />
                <span className="mt-2 text-sm text-cream">Importar</span>
              </div>
              <div onClick={handleExport} className="flex flex-col items-center p-4 bg-primary rounded-xl cursor-pointer hover:bg-accent transition duration-200">
                <Image src="/export.svg" alt="Exportar" width={32} height={32} />
                <span className="mt-2 text-sm text-cream">Exportar</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}