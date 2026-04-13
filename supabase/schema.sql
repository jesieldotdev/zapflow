-- ================================================
-- ZapFlow — Schema Supabase
-- ================================================

-- Perfis dos usuários (vinculado ao auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT,
  plano TEXT DEFAULT 'free' CHECK (plano IN ('free', 'starter', 'pro', 'enterprise')),
  ativo BOOLEAN DEFAULT FALSE, -- liberado pela Kiwify
  instancias_max INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Instâncias WhatsApp por usuário
CREATE TABLE instancias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  numero TEXT,
  status TEXT DEFAULT 'desconectado' CHECK (status IN ('conectado', 'desconectado', 'conectando', 'ban')),
  session_data JSONB, -- dados da sessão Baileys (criptografado)
  webhook_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contatos importados
CREATE TABLE contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instancia_id UUID REFERENCES instancias(id) ON DELETE SET NULL,
  nome TEXT,
  numero TEXT NOT NULL,
  tags TEXT[],
  variaveis JSONB DEFAULT '{}', -- {nome, cidade, produto...}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campanhas de disparo
CREATE TABLE campanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instancia_id UUID NOT NULL REFERENCES instancias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'agendada', 'em_andamento', 'concluida', 'pausada', 'erro')),
  tipo_midia TEXT DEFAULT 'texto' CHECK (tipo_midia IN ('texto', 'imagem', 'video', 'documento', 'audio')),
  midia_url TEXT,
  agendar_em TIMESTAMPTZ,
  intervalo_min_seg INT DEFAULT 5,
  intervalo_max_seg INT DEFAULT 15,
  total_contatos INT DEFAULT 0,
  enviados INT DEFAULT 0,
  erros INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contatos de cada campanha
CREATE TABLE campanha_contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  contato_id UUID REFERENCES contatos(id) ON DELETE SET NULL,
  numero TEXT NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'erro', 'bloqueado')),
  enviado_em TIMESTAMPTZ,
  erro_msg TEXT
);

-- Configuração do chatbot por instância
CREATE TABLE chatbots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instancia_id UUID NOT NULL UNIQUE REFERENCES instancias(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT FALSE,
  nome_bot TEXT DEFAULT 'Assistente',
  prompt_sistema TEXT NOT NULL DEFAULT 'Você é um assistente prestativo. Responda de forma concisa e educada.',
  modelo TEXT DEFAULT 'claude-haiku-4-5-20251001',
  temperatura FLOAT DEFAULT 0.7,
  max_tokens INT DEFAULT 500,
  saudacao TEXT,
  palavras_saida TEXT[] DEFAULT ARRAY['humano', 'atendente', 'pessoa'],
  horario_inicio TIME DEFAULT '08:00',
  horario_fim TIME DEFAULT '18:00',
  dias_semana INT[] DEFAULT ARRAY[1,2,3,4,5], -- 0=Dom, 6=Sáb
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Histórico de conversas do chatbot
CREATE TABLE chatbot_conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instancia_id UUID NOT NULL REFERENCES instancias(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  nome_contato TEXT,
  mensagens JSONB DEFAULT '[]', -- [{role, content, timestamp}]
  status TEXT DEFAULT 'bot' CHECK (status IN ('bot', 'humano', 'encerrado')),
  tokens_usados INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log de mensagens enviadas
CREATE TABLE mensagens_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instancia_id UUID NOT NULL REFERENCES instancias(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campanha_id UUID REFERENCES campanhas(id) ON DELETE SET NULL,
  numero TEXT NOT NULL,
  tipo TEXT DEFAULT 'saida' CHECK (tipo IN ('saida', 'entrada')),
  conteudo TEXT,
  status TEXT DEFAULT 'enviado',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhooks recebidos (Kiwify)
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT DEFAULT 'kiwify',
  evento TEXT,
  payload JSONB,
  processado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- RLS (Row Level Security)
-- ================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE instancias ENABLE ROW LEVEL SECURITY;
ALTER TABLE contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanha_contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbots ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_log ENABLE ROW LEVEL SECURITY;

-- Policies: usuário só vê seus dados
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "instancias_own" ON instancias FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "contatos_own" ON contatos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "campanhas_own" ON campanhas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "chatbots_own" ON chatbots FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "chatbot_conversas_own" ON chatbot_conversas
  FOR ALL USING (
    instancia_id IN (SELECT id FROM instancias WHERE user_id = auth.uid())
  );
CREATE POLICY "campanha_contatos_own" ON campanha_contatos
  FOR ALL USING (
    campanha_id IN (SELECT id FROM campanhas WHERE user_id = auth.uid())
  );
CREATE POLICY "mensagens_log_own" ON mensagens_log FOR ALL USING (auth.uid() = user_id);

-- ================================================
-- Trigger: cria profile automaticamente no signup
-- ================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ================================================
-- Fluxos de automação (editor visual)
-- ================================================

CREATE TABLE fluxos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instancia_ids UUID[],  -- null = aplica em todas as instâncias do usuário
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT FALSE,
  trigger_tipo TEXT DEFAULT 'palavra_chave'
    CHECK (trigger_tipo IN ('palavra_chave', 'qualquer_mensagem', 'primeiro_contato')),
  trigger_valor TEXT,
  nodes JSONB DEFAULT '[]',
  edges JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fluxos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fluxos_own" ON fluxos FOR ALL USING (auth.uid() = user_id);

-- ================================================
-- Migration: instancia_id → instancia_ids (array)
-- ================================================
-- Execute no Supabase SQL Editor se o banco já existir:
-- ALTER TABLE fluxos ADD COLUMN IF NOT EXISTS instancia_ids UUID[];
-- UPDATE fluxos SET instancia_ids = ARRAY[instancia_id] WHERE instancia_id IS NOT NULL;
-- ALTER TABLE fluxos DROP COLUMN IF EXISTS instancia_id;
