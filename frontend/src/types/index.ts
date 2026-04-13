export type Plano = 'free' | 'starter' | 'pro' | 'enterprise'
export type StatusInstancia = 'conectado' | 'desconectado' | 'conectando' | 'ban'
export type StatusCampanha = 'rascunho' | 'agendada' | 'em_andamento' | 'concluida' | 'pausada' | 'erro'
export type TipoMidia = 'texto' | 'imagem' | 'video' | 'documento' | 'audio'
export type StatusConversa = 'bot' | 'humano' | 'encerrado'

export interface Profile {
  id: string
  email: string
  nome?: string
  plano: Plano
  ativo: boolean
  instancias_max: number
  created_at: string
}

export interface Instancia {
  id: string
  user_id: string
  nome: string
  numero?: string
  status: StatusInstancia
  webhook_url?: string
  created_at: string
  updated_at: string
}

export interface Contato {
  id: string
  user_id: string
  instancia_id?: string
  nome?: string
  numero: string
  tags?: string[]
  variaveis?: Record<string, string>
  created_at: string
}

export interface Campanha {
  id: string
  user_id: string
  instancia_id: string
  nome: string
  mensagem: string
  status: StatusCampanha
  tipo_midia: TipoMidia
  midia_url?: string
  agendar_em?: string
  intervalo_min_seg: number
  intervalo_max_seg: number
  total_contatos: number
  enviados: number
  erros: number
  created_at: string
  updated_at: string
}

export interface Chatbot {
  id: string
  instancia_id: string
  user_id: string
  ativo: boolean
  nome_bot: string
  prompt_sistema: string
  modelo: string
  temperatura: number
  max_tokens: number
  saudacao?: string
  palavras_saida: string[]
  horario_inicio: string
  horario_fim: string
  dias_semana: number[]
  created_at: string
  updated_at: string
}

export interface ChatbotConversa {
  id: string
  instancia_id: string
  numero: string
  nome_contato?: string
  mensagens: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: string
  }>
  status: StatusConversa
  tokens_usados: number
  created_at: string
  updated_at: string
}
