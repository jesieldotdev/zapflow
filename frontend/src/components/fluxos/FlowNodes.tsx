'use client'

import { Handle, Position, NodeProps } from '@xyflow/react'
import {
  Play, MessageSquare, Image, Music, FileText,
  Link, GitBranch, Clock, Bot, Variable, UserCheck,
  StopCircle
} from 'lucide-react'
import type { FluxoNodeData, FluxoNodeType } from '@/types'

// ======== Configuração visual por tipo de nó ========

export const NODE_CONFIG: Record<FluxoNodeType, {
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  cor: string
  borda: string
  descricao: string
}> = {
  inicio:     { label: 'Início',      icon: Play,        cor: 'bg-emerald-500/20 text-emerald-400', borda: 'border-emerald-500/40', descricao: 'Gatilho que inicia o fluxo' },
  texto:      { label: 'Texto',       icon: MessageSquare, cor: 'bg-blue-500/20 text-blue-400',    borda: 'border-blue-500/40',    descricao: 'Envia uma mensagem de texto' },
  imagem:     { label: 'Imagem',      icon: Image,       cor: 'bg-purple-500/20 text-purple-400',  borda: 'border-purple-500/40',  descricao: 'Envia uma imagem' },
  audio:      { label: 'Áudio',       icon: Music,       cor: 'bg-pink-500/20 text-pink-400',      borda: 'border-pink-500/40',    descricao: 'Envia um áudio' },
  documento:  { label: 'Documento',   icon: FileText,    cor: 'bg-orange-500/20 text-orange-400',  borda: 'border-orange-500/40',  descricao: 'Envia um documento' },
  link:       { label: 'Link',        icon: Link,        cor: 'bg-cyan-500/20 text-cyan-400',      borda: 'border-cyan-500/40',    descricao: 'Envia um link com prévia' },
  condicao:   { label: 'Condição',    icon: GitBranch,   cor: 'bg-yellow-500/20 text-yellow-400',  borda: 'border-yellow-500/40',  descricao: 'Bifurca o fluxo com base em condição' },
  delay:      { label: 'Delay',       icon: Clock,       cor: 'bg-zinc-500/20 text-zinc-300',      borda: 'border-zinc-500/40',    descricao: 'Aguarda um tempo antes de continuar' },
  ia:         { label: 'IA (Claude)', icon: Bot,         cor: 'bg-violet-500/20 text-violet-400',  borda: 'border-violet-500/40',  descricao: 'Responde com IA usando Claude' },
  variavel:   { label: 'Variável',    icon: Variable,    cor: 'bg-teal-500/20 text-teal-400',      borda: 'border-teal-500/40',    descricao: 'Define uma variável de contexto' },
  transferir: { label: 'Transferir',  icon: UserCheck,   cor: 'bg-green-500/20 text-green-400',    borda: 'border-green-500/40',   descricao: 'Passa para atendimento humano' },
  fim:        { label: 'Fim',         icon: StopCircle,  cor: 'bg-red-500/20 text-red-400',        borda: 'border-red-500/40',     descricao: 'Encerra o fluxo' },
}

// ======== Componente genérico de nó ========

interface FluxoNodeProps extends NodeProps {
  data: FluxoNodeData & { nodeType: FluxoNodeType; selected?: boolean }
}

function preview(tipo: FluxoNodeType, data: FluxoNodeData): string {
  switch (tipo) {
    case 'inicio':
      if (data.trigger_tipo === 'palavra_chave') return `Palavra: "${data.trigger_valor || '...'}"`
      if (data.trigger_tipo === 'primeiro_contato') return 'Primeiro contato'
      return 'Qualquer mensagem'
    case 'texto':      return data.mensagem ? data.mensagem.slice(0, 60) + (data.mensagem.length > 60 ? '…' : '') : 'Mensagem não definida'
    case 'imagem':     return data.caption ? data.caption.slice(0, 50) : data.url ? 'URL configurada' : 'URL não definida'
    case 'audio':      return data.url ? 'Áudio configurado' : 'URL não definida'
    case 'documento':  return data.filename || (data.url ? 'Documento configurado' : 'URL não definida')
    case 'link':       return data.url ? data.url.slice(0, 50) : 'URL não definida'
    case 'condicao':   return data.condicao_valor ? `Se contém "${data.condicao_valor}"` : 'Condição não definida'
    case 'delay':      return data.delay_valor ? `${data.delay_valor} ${data.delay_unidade || 'segundos'}` : 'Tempo não definido'
    case 'ia':         return data.ia_prompt ? data.ia_prompt.slice(0, 50) + '…' : 'Usa config do chatbot'
    case 'variavel':   return data.variavel_nome ? `${data.variavel_nome} = ${data.variavel_valor || '...'}` : 'Variável não definida'
    case 'transferir': return 'Transfere para humano'
    case 'fim':        return 'Encerra a conversa'
    default:           return ''
  }
}

function FluxoNodeBase({ data, selected }: FluxoNodeProps) {
  const tipo = data.nodeType
  const cfg = NODE_CONFIG[tipo]
  const Icon = cfg.icon
  const isInicio = tipo === 'inicio'
  const isFim = tipo === 'fim'
  const isCondicao = tipo === 'condicao'

  return (
    <div className={`
      min-w-[200px] max-w-[240px] rounded-xl border-2 bg-zinc-900 shadow-lg
      transition-all duration-150
      ${selected ? 'border-white/40 shadow-white/10' : cfg.borda}
    `}>
      {/* Handle de entrada (topo) — não aparece no início */}
      {!isInicio && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-500 hover:!bg-green-500 transition-colors"
        />
      )}

      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-[10px] ${cfg.cor}`}>
        <Icon size={14} />
        <span className="text-xs font-semibold">{cfg.label}</span>
      </div>

      {/* Corpo */}
      <div className="px-3 py-2.5">
        <p className="text-zinc-300 text-xs leading-relaxed">
          {preview(tipo, data)}
        </p>
      </div>

      {/* Handles de saída */}
      {!isFim && !isCondicao && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-500 hover:!bg-green-500 transition-colors"
        />
      )}

      {/* Condição: dois handles de saída (Sim / Não) */}
      {isCondicao && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="sim"
            style={{ left: '30%' }}
            className="!w-3 !h-3 !bg-emerald-500/60 !border-2 !border-emerald-500 hover:!bg-emerald-400 transition-colors"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="nao"
            style={{ left: '70%' }}
            className="!w-3 !h-3 !bg-red-500/60 !border-2 !border-red-500 hover:!bg-red-400 transition-colors"
          />
          <div className="flex justify-between px-3 pb-2 text-[10px]">
            <span className="text-emerald-400">Sim</span>
            <span className="text-red-400">Não</span>
          </div>
        </>
      )}
    </div>
  )
}

// Exporta um nodeTypes map para o ReactFlow
export function makeNodeTypes() {
  const types: Record<string, React.ComponentType<any>> = {}
  const allTypes: FluxoNodeType[] = [
    'inicio', 'texto', 'imagem', 'audio', 'documento', 'link',
    'condicao', 'delay', 'ia', 'variavel', 'transferir', 'fim'
  ]
  for (const t of allTypes) {
    types[t] = (props: FluxoNodeProps) => (
      <FluxoNodeBase {...props} data={{ ...props.data, nodeType: t }} />
    )
  }
  return types
}
