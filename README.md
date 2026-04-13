# Zapvio — SaaS de Automação WhatsApp

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15 (App Router) |
| Estilo | Tailwind CSS v4 |
| Auth + DB | Supabase |
| Deploy Frontend | Vercel |
| Deploy Backend | VPS / Railway / Render |
| Vendas | Kiwify (webhook POST `/api/webhook`) |
| WhatsApp | Baileys (Node.js) |
| Chatbot IA | Anthropic Claude API |
| Package manager | Yarn |
| Ícones | Lucide React |

## Arquitetura

```
zapvio/
├── frontend/          → Next.js (Vercel)
│   └── src/app/
│       ├── dashboard/         → Visão geral + status da conexão
│       ├── campanhas/         → Criar e disparar campanhas
│       ├── chatbot/           → Configurar chatbot com IA
│       ├── configuracoes/     → Plano, perfil, webhook
│       ├── login/             → Auth Supabase
│       └── api/
│           ├── qrcode/        → Proxy para backend Baileys
│           └── webhook/       → Kiwify → liberar acesso
│
└── backend/           → Node.js + Baileys (VPS/Railway)
    └── src/
        ├── whatsapp/          → Instâncias Baileys por usuário
        ├── routes/            → REST API
        ├── services/          → Campanhas, chatbot, fila
        └── middleware/        → Auth JWT via Supabase
```

## Fluxo de Uso

1. Usuário compra na Kiwify → webhook libera acesso no Supabase
2. Usuário faz login → conecta número via QR Code
3. Backend cria instância Baileys isolada por usuário
4. Usuário configura campanhas de disparo ou chatbot com IA
5. Mensagens passam pela fila para evitar ban

## Variáveis de Ambiente

### Frontend (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
BACKEND_URL=http://localhost:3001
BACKEND_SECRET=seu_secret_compartilhado
KIWIFY_SECRET=seu_kiwify_secret
ANTHROPIC_API_KEY=
```

### Backend (.env)
```
PORT=3001
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
BACKEND_SECRET=seu_secret_compartilhado
ANTHROPIC_API_KEY=
```

## Por que Backend Separado?

Baileys mantém conexões WebSocket persistentes com o WhatsApp.
A Vercel (serverless) mata processos após ~10 segundos.
O backend precisa rodar em servidor com processo contínuo: VPS, Railway, Render, etc.
