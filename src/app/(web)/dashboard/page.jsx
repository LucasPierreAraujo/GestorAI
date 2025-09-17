'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function DashboardPage() {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const token = document.cookie.split(';').find(row => row.trim().startsWith('token='));

      if (!token) {
        // Se não houver token, redireciona imediatamente.
        router.push('/auth/login');
      } else {
        // Se o token existir, o dashboard pode ser exibido.
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black-basic text-cream">
        Carregando...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black-basic text-cream">
      
      {/* Menu Lateral */}
      <aside className="w-80 bg-primary p-6 flex flex-col justify-between">
        <div>
          <div className="text-lg font-bold mb-8">Menu</div>
          
          {/* Perfil do Usuário */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 rounded-full bg-cream"></div>
            <div className="font-semibold text-lg">Francisco Júnior</div>
          </div>

          {/* Opções do Menu */}
          <nav className="space-y-4">
            <div className="cursor-pointer hover:bg-accent p-2 rounded-lg">Novo Chat</div>
            <div className="cursor-pointer hover:bg-accent p-2 rounded-lg">Histórico</div>
            <div className="cursor-pointer hover:bg-accent p-2 rounded-lg">Templates</div>
          </nav>

          {/* Chats Anteriores */}
          <div className="mt-8">
            <h3 className="font-semibold mb-4">Chats anteriores</h3>
            <div className="space-y-2">
              <div className="cursor-pointer p-2 rounded-lg hover:bg-accent">Ajuda com geração de resp...</div>
              <div className="cursor-pointer p-2 rounded-lg hover:bg-accent">Ajuda com geração de resp...</div>
              <div className="cursor-pointer p-2 rounded-lg hover:bg-accent">Ajuda com geração de resp...</div>
            </div>
          </div>
        </div>

        {/* Botão de Logout ou Configurações */}
        <div className="flex items-center space-x-4 cursor-pointer hover:bg-accent p-2 rounded-lg">
          <span className="text-xl">⚙️</span>
          <span>Configurações</span>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Image
          src="/caminho/para/o/logo.svg"
          alt="GestoAI Logo"
          width={100}
          height={100}
          className="mb-8"
        />
        
        <h1 className="text-3xl font-bold mb-4">
          Olá, username! No que vamos trabalhar hoje?
        </h1>
        
        <div className="w-full max-w-2xl mt-8">
          {/* Barra de Pesquisa */}
          <div className="relative mb-6">
            <input
              type="text"
              className="w-full p-4 pl-12 rounded-full bg-cream text-black-basic shadow-md"
              placeholder="Descreva aqui o que você precisa para que eu possa ajudá-lo"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black-basic text-xl">+</span>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-center space-x-4">
            <div className="flex flex-col items-center p-4 bg-primary rounded-xl cursor-pointer hover:bg-accent">
              <Image src="/caminho/para/icone-importar.svg" alt="Importar" width={32} height={32} />
              <span className="mt-2 text-sm">Importar arquivos</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-primary rounded-xl cursor-pointer hover:bg-accent">
              <Image src="/caminho/para/icone-perguntas.svg" alt="Perguntas" width={32} height={32} />
              <span className="mt-2 text-sm">Perguntas geradas</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-primary rounded-xl cursor-pointer hover:bg-accent">
              <Image src="/caminho/para/icone-historico.svg" alt="Histórico" width={32} height={32} />
              <span className="mt-2 text-sm">Histórico</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}