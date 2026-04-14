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
  foto_url?: string
  tags?: string[]
  variaveis?: Record<string, string>
  created_at: string
  updated_at?: string
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

export interface MensagemConversa {
  role: 'user' | 'assistant'
  content: string
  from_human?: boolean
  timestamp: string
}

export interface ChatbotConversa {
  id: string
  instancia_id: string
  numero: string
  nome_contato?: string
  mensagens: MensagemConversa[]
  status: StatusConversa
  tokens_usados: number
  created_at: string
  updated_at: string
}

// ===== Fluxos =====

export type FluxoNodeType =
  | 'inicio'
  | 'texto'
  | 'imagem'
  | 'audio'
  | 'documento'
  | 'link'
  | 'condicao'
  | 'delay'
  | 'ia'
  | 'variavel'
  | 'transferir'
  | 'fim'

export interface FluxoNodeData extends Record<string, unknown> {
  label?: string
  mensagem?: string
  url?: string
  caption?: string
  filename?: string
  delay_valor?: number
  delay_unidade?: 'segundos' | 'minutos'
  condicao_campo?: 'mensagem' | 'variavel'
  condicao_variavel?: string
  condicao_operador?: 'contem' | 'igual' | 'nao_contem' | 'comeca_com'
  condicao_valor?: string
  ia_prompt?: string
  ia_modelo?: string
  variavel_nome?: string
  variavel_valor?: string
  trigger_tipo?: 'palavra_chave' | 'qualquer_mensagem' | 'primeiro_contato'
  trigger_valor?: string
}

export interface FluxoNode {
  id: string
  type: FluxoNodeType
  position: { x: number; y: number }
  data: FluxoNodeData
}

export interface FluxoEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  label?: string
  animated?: boolean
}

export interface Fluxo {
  id: string
  user_id: string
  instancia_ids?: string[]
  nome: string
  descricao?: string
  ativo: boolean
  trigger_tipo: 'palavra_chave' | 'qualquer_mensagem' | 'primeiro_contato'
  trigger_valor?: string
  nodes: FluxoNode[]
  edges: FluxoEdge[]
  created_at: string
  updated_at: string
}
