Markdown

# GestorAI

Este é o sistema GestorAI, um assistente virtual de produtividade e gerenciamento de tarefas desenvolvido com **Next.js**, **Prisma** e **Groq**.

**Status do Deploy:** [https://gestor-ai.vercel.app](https://gestor-ai.vercel.app)
Bot do telegram: t.me/GestoAI_Bot

## 🚀 Getting Started (Configuração Local)

Siga estes passos para configurar e rodar o projeto em seu ambiente de desenvolvimento.

### Pré-requisitos

* Node.js (versão recomendada: 18 ou superior)
* npm ou Yarn
* Acesso ao seu banco de dados **PostgreSQL** (configurado via Supabase).

### 1. Instalação de Dependências

Instale todas as dependências do projeto:

```bash
npm install
# ou
yarn install
2. Configuração do Ambiente
Seu projeto utiliza o PostgreSQL do Supabase e as chaves secretas.

Renomeie o arquivo env.exemple para .env na raiz do projeto.

Bash

mv env.exemple .env 
Edite o novo arquivo .env com suas credenciais do Supabase e chaves secretas.

AVISO: Substitua os placeholders ([USUARIO], [SENHA], etc.) por suas chaves reais.

Ini, TOML

# --- Configuração do Banco de Dados PostgreSQL (Supabase) ---

# 1. DATABASE_URL: Usada pela sua aplicação para QUERIES (Pooler/Connection String).
DATABASE_URL="postgresql://[USUARIO]@[POOLER_URL]:6543/postgres?pgbouncer=true"

# 2. DIRECT_URL: Usada pelo Prisma CLI para MIGRATIONS (URL direta).
DIRECT_URL="postgresql://[USUARIO]:[SENHA]@[DB_HOST]:5432/postgres"

# --- Chaves Secretas ---

# JWT Secret para assinar e verificar tokens
JWT_SECRET="sua_chave_secreta_jwt_aqui"

# Chave da API do Groq
GROQ_API_KEY="chave_da_api_groq_aqui"

# Variável usada para integrações externas (Telegram)
TELEGRAM_BOT_TOKEN="token_do_seu_bot_telegram_aqui"
3. Configuração do Banco de Dados
Aplique as migrações:

Bash

npx prisma migrate deploy
4. Rodando o Servidor de Desenvolvimento
Inicie o servidor de desenvolvimento:

Bash

npm run dev
# ou
yarn dev
Abra http://localhost:3000 com seu navegador.

🤖 Configuração do Telegram Bot (Em Produção - Vercel)
Esta seção detalha como configurar o bot para rodar diretamente com sua URL de deploy na Vercel.

1. Pré-requisitos (BotFather)
É obrigatório interagir com o BotFather (@BotFather) no Telegram para obter o token do bot:

No Telegram, inicie uma conversa com o @BotFather.

Use o comando /newbot e siga os passos para criar seu bot e receber o TELEGRAM_BOT_TOKEN.

Este token DEVE estar configurado como variável de ambiente no seu projeto Vercel (na dashboard da Vercel).

2. Configurar o Webhook (Instalação Definitiva)
Você usará a URL do seu deploy na Vercel para configurar o Webhook, que direciona todas as mensagens do Telegram para a sua API:

Endpoint: /api/telegram-webhook
URL de Deploy: https://gestor-ai.vercel.app

Use o curl no seu terminal, substituindo [TOKEN] pelo seu TELEGRAM_BOT_TOKEN:

Bash

# Comando cURL para configurar o webhook
# Este comando DEVE ser executado no terminal, após a implantação na Vercel.

curl -F "url=[https://gestor-ai.vercel.app/api/telegram-webhook](https://gestor-ai.vercel.app/api/telegram-webhook)" \
  [https://api.telegram.org/bot](https://api.telegram.org/bot)[TOKEN]/setWebhook
3. Teste
Após a configuração bem-sucedida (o comando curl deve retornar "ok": true), seu bot estará ativo e pronto para receber mensagens, com o histórico salvo diretamente no seu banco de dados do Supabase.
