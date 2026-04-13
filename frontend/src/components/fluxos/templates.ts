// Templates prontos de fluxos de automação
// Cada template define nodes e edges prontos para uso

export interface FluxoTemplate {
  id: string
  nome: string
  descricao: string
  categoria: 'vendas' | 'suporte' | 'boas_vindas' | 'ia'
  trigger_tipo: string
  trigger_valor: string
  nodes: any[]
  edges: any[]
}

export const TEMPLATES: FluxoTemplate[] = [
  // ──────────────────────────────────────────────────────────
  // 1. BOAS-VINDAS
  // ──────────────────────────────────────────────────────────
  {
    id: 'boas_vindas',
    nome: 'Boas-vindas',
    descricao: 'Recebe novos contatos com uma mensagem calorosa',
    categoria: 'boas_vindas',
    trigger_tipo: 'primeiro_contato',
    trigger_valor: '',
    nodes: [
      {
        id: 'n1', type: 'inicio', position: { x: 250, y: 60 },
        data: { trigger_tipo: 'primeiro_contato', trigger_valor: '' },
      },
      {
        id: 'n2', type: 'delay', position: { x: 250, y: 180 },
        data: { delay_valor: 1, delay_unidade: 'segundos' },
      },
      {
        id: 'n3', type: 'texto', position: { x: 250, y: 300 },
        data: {
          mensagem:
            'Olá! 👋 Seja bem-vindo(a)!\n\nEstamos felizes em ter você por aqui. Como posso te ajudar hoje?\n\n1️⃣ Informações sobre produtos\n2️⃣ Suporte técnico\n3️⃣ Falar com atendente',
        },
      },
      {
        id: 'n4', type: 'fim', position: { x: 250, y: 460 },
        data: {},
      },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // 2. FLUXO DE VENDAS
  // ──────────────────────────────────────────────────────────
  {
    id: 'vendas',
    nome: 'Fluxo de Vendas',
    descricao: 'Qualifica leads e apresenta oferta com condição de interesse',
    categoria: 'vendas',
    trigger_tipo: 'palavra_chave',
    trigger_valor: 'preço,valor,comprar,produto,quanto custa',
    nodes: [
      {
        id: 'n1', type: 'inicio', position: { x: 250, y: 60 },
        data: { trigger_tipo: 'palavra_chave', trigger_valor: 'preço,valor,comprar,produto,quanto custa' },
      },
      {
        id: 'n2', type: 'texto', position: { x: 250, y: 200 },
        data: {
          mensagem:
            'Oi! 😊 Que ótimo que você tem interesse nos nossos produtos!\n\nTemos soluções incríveis para você. Deixa eu te contar mais...',
        },
      },
      {
        id: 'n3', type: 'delay', position: { x: 250, y: 340 },
        data: { delay_valor: 2, delay_unidade: 'segundos' },
      },
      {
        id: 'n4', type: 'texto', position: { x: 250, y: 460 },
        data: {
          mensagem:
            '🎯 *Nosso produto principal:*\n\n✅ Benefício 1\n✅ Benefício 2\n✅ Benefício 3\n\n💰 A partir de R$ XX,XX\n\nVocê tem interesse em saber mais detalhes?',
        },
      },
      {
        id: 'n5', type: 'condicao', position: { x: 250, y: 620 },
        data: {
          condicao_campo: 'mensagem',
          condicao_operador: 'contem',
          condicao_valor: 'sim,quero,claro,pode,interesse',
        },
      },
      {
        id: 'n6', type: 'texto', position: { x: 60, y: 800 },
        data: {
          mensagem:
            '🎉 Excelente! Vou te passar para um de nossos especialistas que vai te atender agora!\n\nAguarde um momento...',
        },
      },
      {
        id: 'n7', type: 'transferir', position: { x: 60, y: 960 },
        data: {},
      },
      {
        id: 'n8', type: 'texto', position: { x: 440, y: 800 },
        data: {
          mensagem:
            'Tudo bem! 😊 Quando quiser saber mais é só chamar.\n\nEstamos sempre aqui para te ajudar! 👍',
        },
      },
      {
        id: 'n9', type: 'fim', position: { x: 440, y: 960 },
        data: {},
      },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5' },
      { id: 'e5', source: 'n5', target: 'n6', sourceHandle: 'sim' },
      { id: 'e6', source: 'n5', target: 'n8', sourceHandle: 'nao' },
      { id: 'e7', source: 'n6', target: 'n7' },
      { id: 'e8', source: 'n8', target: 'n9' },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // 3. SUPORTE TÉCNICO
  // ──────────────────────────────────────────────────────────
  {
    id: 'suporte',
    nome: 'Suporte Técnico',
    descricao: 'Recebe solicitações de suporte e transfere para atendente',
    categoria: 'suporte',
    trigger_tipo: 'palavra_chave',
    trigger_valor: 'ajuda,suporte,problema,erro,bug,não funciona',
    nodes: [
      {
        id: 'n1', type: 'inicio', position: { x: 250, y: 60 },
        data: { trigger_tipo: 'palavra_chave', trigger_valor: 'ajuda,suporte,problema,erro,bug,não funciona' },
      },
      {
        id: 'n2', type: 'texto', position: { x: 250, y: 200 },
        data: {
          mensagem:
            '🛠️ Recebemos sua solicitação de suporte!\n\nPor favor, descreva o problema com o máximo de detalhes possível para que possamos te ajudar melhor.',
        },
      },
      {
        id: 'n3', type: 'variavel', position: { x: 250, y: 360 },
        data: { variavel_nome: 'descricao_problema', variavel_valor: '{{mensagem}}' },
      },
      {
        id: 'n4', type: 'delay', position: { x: 250, y: 480 },
        data: { delay_valor: 3, delay_unidade: 'segundos' },
      },
      {
        id: 'n5', type: 'texto', position: { x: 250, y: 600 },
        data: {
          mensagem:
            '✅ Problema registrado! Estou transferindo você para um de nossos especialistas.\n\nTempo médio de espera: 2-5 minutos.',
        },
      },
      {
        id: 'n6', type: 'transferir', position: { x: 250, y: 760 },
        data: {},
      },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5' },
      { id: 'e5', source: 'n5', target: 'n6' },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // 4. ATENDENTE IA
  // ──────────────────────────────────────────────────────────
  {
    id: 'atendente_ia',
    nome: 'Atendente IA',
    descricao: 'Responde qualquer mensagem com inteligência artificial (Claude)',
    categoria: 'ia',
    trigger_tipo: 'qualquer_mensagem',
    trigger_valor: '',
    nodes: [
      {
        id: 'n1', type: 'inicio', position: { x: 250, y: 60 },
        data: { trigger_tipo: 'qualquer_mensagem', trigger_valor: '' },
      },
      {
        id: 'n2', type: 'ia', position: { x: 250, y: 200 },
        data: {
          ia_modelo: 'claude-haiku-4-5-20251001',
          ia_prompt:
            'Você é um assistente virtual de atendimento ao cliente. Responda de forma educada, concisa e útil. Sempre em português do Brasil. Se não souber a resposta, oriente o cliente a entrar em contato com a equipe humana digitando "atendente".',
        },
      },
      {
        id: 'n3', type: 'condicao', position: { x: 250, y: 380 },
        data: {
          condicao_campo: 'mensagem',
          condicao_operador: 'contem',
          condicao_valor: 'atendente,humano,pessoa,falar com alguém',
        },
      },
      {
        id: 'n4', type: 'transferir', position: { x: 60, y: 560 },
        data: {},
      },
      {
        id: 'n5', type: 'fim', position: { x: 440, y: 560 },
        data: {},
      },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4', sourceHandle: 'sim' },
      { id: 'e4', source: 'n3', target: 'n5', sourceHandle: 'nao' },
    ],
  },
]

export const CATEGORIA_LABEL: Record<string, string> = {
  boas_vindas: 'Boas-vindas',
  vendas: 'Vendas',
  suporte: 'Suporte',
  ia: 'Inteligência Artificial',
}

export const CATEGORIA_COR: Record<string, string> = {
  boas_vindas: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  vendas: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  suporte: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  ia: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
}

// ──────────────────────────────────────────────────────────
// Funções de encode/decode de token
// ──────────────────────────────────────────────────────────

export interface FluxoTokenData {
  nome: string
  trigger_tipo: string
  trigger_valor: string
  nodes: any[]
  edges: any[]
}

export function encodeFluxoToken(data: FluxoTokenData): string {
  return btoa(encodeURIComponent(JSON.stringify(data)))
}

export function decodeFluxoToken(token: string): FluxoTokenData {
  return JSON.parse(decodeURIComponent(atob(token.trim())))
}

/** Remapeia todos os IDs de nodes e edges para novos UUIDs únicos */
export function remapearIds(data: FluxoTokenData): { nodes: any[]; edges: any[] } {
  const idMap: Record<string, string> = {}

  const nodes = data.nodes.map((n: any) => {
    const novoId = crypto.randomUUID()
    idMap[n.id] = novoId
    return { ...n, id: novoId }
  })

  const edges = data.edges.map((e: any) => ({
    ...e,
    id: crypto.randomUUID(),
    source: idMap[e.source] ?? e.source,
    target: idMap[e.target] ?? e.target,
  }))

  return { nodes, edges }
}
