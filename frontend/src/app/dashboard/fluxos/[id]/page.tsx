'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Save, ArrowLeft, Power, Loader2,
  Plus, ChevronDown, ChevronUp,
  FlaskConical, Send, RotateCcw, X,
  CheckCircle2, XCircle, Clock, Variable,
  UserCheck, StopCircle, Bot, Smartphone,
  PanelLeftOpen, HelpCircle, BookOpen,
  Workflow, Braces, GitBranch, Keyboard,
} from 'lucide-react'
import type { Fluxo, FluxoNodeType, FluxoNodeData } from '@/types'
import { makeNodeTypes, NODE_CONFIG } from '@/components/fluxos/FlowNodes'
import PropertiesPanel from '@/components/fluxos/PropertiesPanel'

// ======== Simulação de fluxo ========

interface SimStep {
  nodeId: string
  nodeType: FluxoNodeType
  kind: 'mensagem' | 'sistema' | 'erro'
  content: string
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

function simularFluxo(
  nodes: Node[],
  edges: Edge[],
  mensagemUsuario: string
): SimStep[] {
  const steps: SimStep[] = []

  const startNode = nodes.find(n => n.type === 'inicio')
  if (!startNode) {
    steps.push({ nodeId: '', nodeType: 'fim', kind: 'erro', content: 'Nenhum nó de Início encontrado no fluxo.' })
    return steps
  }

  const data = startNode.data as FluxoNodeData
  const triggerTipo = data.trigger_tipo || 'palavra_chave'
  const triggerValor = (data.trigger_valor || '').trim()

  if (triggerTipo === 'palavra_chave' && triggerValor) {
    const keywords = triggerValor.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
    const match = keywords.some(k => mensagemUsuario.toLowerCase().includes(k))
    if (!match) {
      steps.push({
        nodeId: startNode.id,
        nodeType: 'inicio',
        kind: 'sistema',
        content: `Gatilho não ativado. Palavras-chave esperadas: "${triggerValor}"`
      })
      return steps
    }
  }

  steps.push({ nodeId: startNode.id, nodeType: 'inicio', kind: 'sistema', content: 'Fluxo iniciado' })

  const vars: Record<string, string> = { mensagem: mensagemUsuario }
  let currentId: string = startNode.id
  const visited = new Set<string>()

  while (currentId) {
    if (visited.has(currentId)) {
      steps.push({ nodeId: currentId, nodeType: 'fim', kind: 'erro', content: 'Loop detectado — execução interrompida.' })
      break
    }
    visited.add(currentId)

    const node = nodes.find(n => n.id === currentId)
    if (!node) break

    const d = node.data as FluxoNodeData
    const tipo = node.type as FluxoNodeType
    let nextId = ''
    let stop = false

    switch (tipo) {
      case 'inicio':
        break

      case 'texto':
        steps.push({
          nodeId: node.id, nodeType: tipo, kind: 'mensagem',
          content: interpolate(d.mensagem || '(mensagem vazia)', vars)
        })
        break

      case 'imagem':
        steps.push({
          nodeId: node.id, nodeType: tipo, kind: 'mensagem',
          content: `🖼️ Imagem enviada${d.caption ? `\n${interpolate(d.caption, vars)}` : ''}\n${d.url || '(URL não definida)'}`
        })
        break

      case 'audio':
        steps.push({
          nodeId: node.id, nodeType: tipo, kind: 'mensagem',
          content: `🎵 Áudio enviado\n${d.url || '(URL não definida)'}`
        })
        break

      case 'documento':
        steps.push({
          nodeId: node.id, nodeType: tipo, kind: 'mensagem',
          content: `📄 Documento: ${d.filename || '(sem nome)'}\n${d.url || '(URL não definida)'}`
        })
        break

      case 'link':
        steps.push({
          nodeId: node.id, nodeType: tipo, kind: 'mensagem',
          content: `${interpolate(d.mensagem || '', vars)}\n🔗 ${d.url || '(URL não definida)'}`
        })
        break

      case 'delay':
        steps.push({
          nodeId: node.id, nodeType: tipo, kind: 'sistema',
          content: `⏱ Aguardaria ${d.delay_valor || 0} ${d.delay_unidade || 'segundos'}`
        })
        break

      case 'ia':
        steps.push({
          nodeId: node.id, nodeType: tipo, kind: 'mensagem',
          content: `🤖 [Resposta gerada pelo Claude]\nModelo: ${d.ia_modelo || 'claude-haiku-4-5-20251001'}${d.ia_prompt ? `\nPrompt: ${d.ia_prompt.slice(0, 80)}…` : '\n(usa prompt do chatbot)'}`
        })
        break

      case 'variavel': {
        const val = d.variavel_valor === '{{mensagem}}' ? mensagemUsuario : interpolate(d.variavel_valor || '', vars)
        if (d.variavel_nome) vars[d.variavel_nome] = val
        steps.push({
          nodeId: node.id, nodeType: tipo, kind: 'sistema',
          content: `📌 Variável definida: ${d.variavel_nome || '?'} = "${val}"`
        })
        break
      }

      case 'condicao': {
        const campo = d.condicao_campo === 'variavel'
          ? (vars[d.condicao_variavel || ''] ?? '')
          : mensagemUsuario
        const valorCondicao = (d.condicao_valor || '').toLowerCase()
        const campoLower = campo.toLowerCase()

        let resultado = false
        switch (d.condicao_operador) {
          case 'igual':       resultado = campoLower === valorCondicao; break
          case 'nao_contem':  resultado = !campoLower.includes(valorCondicao); break
          case 'comeca_com':  resultado = campoLower.startsWith(valorCondicao); break
          default:            resultado = campoLower.includes(valorCondicao)
        }

        const branch = resultado ? 'sim' : 'nao'
        steps.push({
          nodeId: node.id, nodeType: tipo, kind: 'sistema',
          content: `🔀 Condição: "${campo}" ${d.condicao_operador || 'contem'} "${d.condicao_valor}" → ${resultado ? '✅ Sim' : '❌ Não'}`
        })

        const condEdge = edges.find(e => e.source === node.id && e.sourceHandle === branch)
        nextId = condEdge?.target || ''
        currentId = nextId
        continue
      }

      case 'transferir':
        steps.push({ nodeId: node.id, nodeType: tipo, kind: 'sistema', content: '👤 Conversa transferida para atendente humano' })
        stop = true
        break

      case 'fim':
        steps.push({ nodeId: node.id, nodeType: tipo, kind: 'sistema', content: '🏁 Fluxo encerrado' })
        stop = true
        break
    }

    if (stop) break

    const nextEdge = edges.find(e => e.source === node.id && !e.sourceHandle)
    currentId = nextEdge?.target || ''
  }

  return steps
}

// ======== Paleta ========

const PALETA: { tipo: FluxoNodeType; group: string }[] = [
  { tipo: 'inicio',     group: 'Controle' },
  { tipo: 'texto',      group: 'Mensagens' },
  { tipo: 'imagem',     group: 'Mensagens' },
  { tipo: 'audio',      group: 'Mensagens' },
  { tipo: 'documento',  group: 'Mensagens' },
  { tipo: 'link',       group: 'Mensagens' },
  { tipo: 'condicao',   group: 'Lógica' },
  { tipo: 'delay',      group: 'Lógica' },
  { tipo: 'variavel',   group: 'Lógica' },
  { tipo: 'ia',         group: 'IA' },
  { tipo: 'transferir', group: 'Controle' },
  { tipo: 'fim',        group: 'Controle' },
]

const GRUPOS = ['Controle', 'Mensagens', 'Lógica', 'IA']

let nodeIdCounter = Date.now()
function newId() { return `node_${++nodeIdCounter}` }

const SIM_ICON: Partial<Record<FluxoNodeType, React.ComponentType<any>>> = {
  delay:      Clock,
  variavel:   Variable,
  transferir: UserCheck,
  fim:        StopCircle,
  ia:         Bot,
  condicao:   () => <span className="text-yellow-400 font-bold text-xs">IF</span>,
}

// ======== Componente da paleta (reutilizado em desktop e mobile) ========

function PaletaConteudo({
  grupoAberto,
  setGrupoAberto,
  onAdicionar,
}: {
  grupoAberto: string
  setGrupoAberto: (g: string) => void
  onAdicionar: (tipo: FluxoNodeType) => void
}) {
  return (
    <div className="flex-1 overflow-y-auto py-2">
      {GRUPOS.map(grupo => {
        const itens = PALETA.filter(p => p.group === grupo)
        const aberto = grupoAberto === grupo
        return (
          <div key={grupo}>
            <button
              onClick={() => setGrupoAberto(aberto ? '' : grupo)}
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors"
            >
              {grupo}
              {aberto ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
            {aberto && itens.map(({ tipo }) => {
              const cfg = NODE_CONFIG[tipo]
              const Icon = cfg.icon
              return (
                <button
                  key={tipo}
                  onClick={() => onAdicionar(tipo)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-zinc-800 ${cfg.cor}`}
                >
                  <Icon size={14} />
                  <span className="font-medium">{cfg.label}</span>
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

export default function FluxoEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [fluxo, setFluxo] = useState<Fluxo | null>(null)
  const [instancias, setInstancias] = useState<{ id: string; nome: string }[]>([])
  const [instanciaIds, setInstanciaIds] = useState<string[]>([])
  const [instPopupAberto, setInstPopupAberto] = useState(false)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [nodeSelecionado, setNodeSelecionado] = useState<Node | null>(null)
  const [paletaAberta, setPaletaAberta] = useState(true)
  const [grupoAberto, setGrupoAberto] = useState<string>('Mensagens')
  const [paletaMobile, setPaletaMobile] = useState(false)

  // Ajuda
  const [ajudaAberta, setAjudaAberta] = useState(false)

  // Simulação
  const [simAberta, setSimAberta] = useState(false)
  const [simInput, setSimInput] = useState('')
  const [simSteps, setSimSteps] = useState<SimStep[]>([])
  const [simNodeAtivo, setSimNodeAtivo] = useState<string | null>(null)
  const [simRodando, setSimRodando] = useState(false)
  const simEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('[data-inst-popup]')) setInstPopupAberto(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const nodeTypes = useMemo(() => makeNodeTypes(), [])
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      const [{ data, error }, { data: insts }] = await Promise.all([
        supabase.from('fluxos').select('*').eq('id', id).single(),
        userData.user
          ? supabase.from('instancias').select('id, nome').eq('user_id', userData.user.id)
          : Promise.resolve({ data: [] }),
      ])
      if (error || !data) { router.push('/dashboard/fluxos'); return }
      setFluxo(data)
      setInstancias(insts || [])
      setInstanciaIds(data.instancia_ids || [])
      setNodes((data.nodes || []).map((n: any) => ({
        id: n.id, type: n.type, position: n.position,
        data: { ...n.data, nodeType: n.type }, selected: false,
      })))
      setEdges((data.edges || []).map((e: any) => ({
        id: e.id, source: e.source, target: e.target,
        sourceHandle: e.sourceHandle, label: e.label,
        animated: e.animated ?? true,
        style: { stroke: '#4ade80', strokeWidth: 1.5 },
        labelStyle: { fill: '#a1a1aa', fontSize: 11 },
      })))
      setLoading(false)
    }
    load()
  }, [id])

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({ ...connection, animated: true, style: { stroke: '#4ade80', strokeWidth: 1.5 } }, eds))
  }, [setEdges])

  function adicionarNode(tipo: FluxoNodeType) {
    const nid = newId()
    setNodes(ns => [...ns, {
      id: nid, type: tipo,
      position: { x: 300 + Math.random() * 100, y: 200 + Math.random() * 100 },
      data: { nodeType: tipo } as FluxoNodeData & { nodeType: FluxoNodeType },
    }])
    setPaletaMobile(false)
  }

  function atualizarNodeData(nodeId: string, partial: Partial<FluxoNodeData>) {
    setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...partial } } : n))
    if (nodeSelecionado?.id === nodeId) {
      setNodeSelecionado(prev => prev ? { ...prev, data: { ...prev.data, ...partial } } : prev)
    }
  }

  function removerNode(nodeId: string) {
    setNodes(ns => ns.filter(n => n.id !== nodeId))
    setEdges(es => es.filter(e => e.source !== nodeId && e.target !== nodeId))
    setNodeSelecionado(null)
  }

  async function salvar() {
    if (!fluxo) return
    setSalvando(true)
    const startNode = nodes.find(n => n.type === 'inicio')
    const triggerTipo = (startNode?.data as any)?.trigger_tipo || 'qualquer_mensagem'
    const triggerValor = (startNode?.data as any)?.trigger_valor || null

    await supabase.from('fluxos').update({
      nodes: nodes.map(n => ({
        id: n.id, type: n.type, position: n.position,
        data: Object.fromEntries(Object.entries(n.data).filter(([k]) => k !== 'nodeType'))
      })),
      edges: edges.map(e => ({
        id: e.id, source: e.source, target: e.target,
        sourceHandle: e.sourceHandle, label: e.label, animated: e.animated
      })),
      trigger_tipo: triggerTipo,
      trigger_valor: triggerValor,
      instancia_ids: instanciaIds.length ? instanciaIds : null,
      updated_at: new Date().toISOString(),
    }).eq('id', fluxo.id)
    setSalvando(false)
  }

  async function toggleAtivo() {
    if (!fluxo) return
    const novoAtivo = !fluxo.ativo
    await supabase.from('fluxos').update({ ativo: novoAtivo }).eq('id', fluxo.id)
    setFluxo(f => f ? { ...f, ativo: novoAtivo } : f)
  }

  async function executarSim() {
    if (!simInput.trim()) return
    setSimRodando(true)
    setSimSteps([])
    setSimNodeAtivo(null)

    const steps = simularFluxo(nodes, edges, simInput.trim())

    for (const step of steps) {
      await new Promise(r => setTimeout(r, 400))
      setSimNodeAtivo(step.nodeId)
      setSimSteps(prev => [...prev, step])
      simEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    setSimNodeAtivo(null)
    setSimRodando(false)
  }

  const nodesComDestaque = useMemo(() => nodes.map(n => ({
    ...n,
    style: simNodeAtivo === n.id
      ? { filter: 'drop-shadow(0 0 8px #4ade80)', opacity: 1 }
      : simAberta && simNodeAtivo
        ? { opacity: 0.4 }
        : {},
  })), [nodes, simNodeAtivo, simAberta])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-950">
        <Loader2 className="animate-spin text-zinc-500" size={32} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 overflow-hidden bg-zinc-950">

      {/* ---- Paleta esquerda — desktop only ---- */}
      <div className="hidden lg:flex w-56 flex-shrink-0 border-r border-zinc-800 bg-zinc-900 flex-col overflow-hidden">
        <button
          onClick={() => setPaletaAberta(v => !v)}
          className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2"><Plus size={14} /> Adicionar nó</span>
          {paletaAberta ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        {paletaAberta && (
          <PaletaConteudo
            grupoAberto={grupoAberto}
            setGrupoAberto={setGrupoAberto}
            onAdicionar={adicionarNode}
          />
        )}
      </div>

      {/* ---- Paleta mobile — overlay ---- */}
      {paletaMobile && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setPaletaMobile(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col overflow-hidden lg:hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0">
              <span className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <Plus size={14} /> Adicionar nó
              </span>
              <button onClick={() => setPaletaMobile(false)} className="text-zinc-500 hover:text-white transition-colors p-1">
                <X size={16} />
              </button>
            </div>
            <PaletaConteudo
              grupoAberto={grupoAberto}
              setGrupoAberto={setGrupoAberto}
              onAdicionar={adicionarNode}
            />
          </div>
        </>
      )}

      {/* ---- Canvas ---- */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-zinc-800 bg-zinc-900 flex-shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile: open palette */}
            <button
              onClick={() => setPaletaMobile(true)}
              className="lg:hidden text-zinc-400 hover:text-white transition-colors flex-shrink-0 p-1"
              aria-label="Adicionar nó"
            >
              <PanelLeftOpen size={18} />
            </button>
            <button
              onClick={() => router.push('/dashboard/fluxos')}
              className="text-zinc-400 hover:text-white transition-colors flex-shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-white text-sm truncate">{fluxo?.nome}</h1>
              <p className="text-zinc-500 text-xs hidden sm:block">{nodes.length} nós · {edges.length} conexões</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => { setSimAberta(v => !v); setSimSteps([]); setSimNodeAtivo(null); setNodeSelecionado(null) }}
              className={`flex items-center gap-1 text-xs font-semibold px-2 sm:px-3 py-1.5 rounded-lg border transition-colors ${
                simAberta
                  ? 'bg-violet-500/20 text-violet-400 border-violet-500/30'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
              }`}
            >
              <FlaskConical size={13} />
              <span className="hidden sm:inline">Testar</span>
            </button>

            {/* Instâncias */}
            <div className="relative" data-inst-popup>
              <button
                onClick={() => setInstPopupAberto(v => !v)}
                className={`flex items-center gap-1 text-xs font-semibold px-2 sm:px-3 py-1.5 rounded-lg border transition-colors ${
                  instanciaIds.length > 0
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                }`}
              >
                <Smartphone size={13} />
                <span className="hidden sm:inline">
                  {instanciaIds.length > 0 ? `${instanciaIds.length} nº` : 'Todas'}
                </span>
              </button>
              {instPopupAberto && (
                <div className="absolute right-0 top-9 z-30 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl p-3 min-w-[200px]">
                  <p className="text-xs text-zinc-400 font-semibold mb-2 px-1">Números vinculados</p>
                  {instancias.length === 0 ? (
                    <p className="text-xs text-zinc-500 px-1 py-1">Nenhuma instância disponível</p>
                  ) : (
                    <div className="space-y-1">
                      {instancias.map(inst => (
                        <label key={inst.id} className="flex items-center gap-2.5 px-1 py-1 rounded-lg hover:bg-zinc-700 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={instanciaIds.includes(inst.id)}
                            onChange={e => setInstanciaIds(prev =>
                              e.target.checked ? [...prev, inst.id] : prev.filter(x => x !== inst.id)
                            )}
                            className="w-3.5 h-3.5 rounded accent-green-500"
                          />
                          <span className="text-sm text-zinc-200">{inst.nome}</span>
                        </label>
                      ))}
                      <p className="text-xs text-zinc-500 px-1 pt-1 border-t border-zinc-700 mt-1">
                        Sem seleção = aplica em todas
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={toggleAtivo}
              className={`flex items-center gap-1 text-xs font-semibold px-2 sm:px-3 py-1.5 rounded-lg border transition-colors ${
                fluxo?.ativo
                  ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
              }`}
            >
              <Power size={13} />
              <span className="hidden sm:inline">{fluxo?.ativo ? 'Ativo' : 'Inativo'}</span>
            </button>

            <button
              onClick={() => setAjudaAberta(true)}
              className="flex items-center gap-1 text-xs font-semibold px-2 sm:px-3 py-1.5 rounded-lg border transition-colors bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-white"
              title="Ajuda"
            >
              <HelpCircle size={13} />
              <span className="hidden sm:inline">Ajuda</span>
            </button>

            <button
              onClick={salvar}
              disabled={salvando}
              className="flex items-center gap-1 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold text-sm px-3 sm:px-4 py-1.5 rounded-lg transition-colors"
            >
              {salvando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span className="hidden sm:inline">Salvar</span>
            </button>
          </div>
        </div>

        {/* ReactFlow canvas */}
        <div className="flex-1 overflow-hidden" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #0e0e1a 0%, #09090b 65%)' }}>
          <ReactFlow
            nodes={nodesComDestaque}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => { setNodeSelecionado(node); setSimAberta(false) }}
            onPaneClick={() => setNodeSelecionado(null)}
            fitView
            colorMode="dark"
            deleteKeyCode={['Delete', 'Backspace']}
            defaultEdgeOptions={{ animated: true, style: { stroke: '#4ade80', strokeWidth: 1.5 } }}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Lines} gap={36} size={0.4} color="#18182a" />
            <Controls style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }} />
            <MiniMap
              className="hidden sm:block"
              style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }}
              nodeColor="#27272a"
              maskColor="rgba(0,0,0,0.6)"
            />
            {nodes.length === 0 && (
              <Panel position="top-center">
                <div className="bg-zinc-800/90 border border-zinc-700 rounded-xl px-4 sm:px-5 py-3 sm:py-4 text-center mt-6 backdrop-blur-sm">
                  <p className="text-zinc-300 font-medium">Canvas vazio</p>
                  <p className="text-zinc-500 text-sm mt-1">
                    <span className="hidden lg:inline">Adicione nós pela paleta à esquerda</span>
                    <span className="lg:hidden">Toque em <PanelLeftOpen size={12} className="inline" /> para adicionar nós</span>
                  </p>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>

      {/* ---- Painel de simulação ---- */}
      {simAberta && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setSimAberta(false)}
          />
          {/* Panel: fixed bottom sheet on mobile, sidebar on desktop */}
          <div className={`
            bg-zinc-900 border-zinc-800 flex flex-col overflow-hidden
            fixed bottom-0 left-0 right-0 h-[60vh] border-t rounded-t-2xl z-40
            lg:static lg:h-auto lg:w-80 lg:flex-shrink-0 lg:border-l lg:border-t-0 lg:rounded-none lg:z-auto
          `}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-violet-500/10 flex-shrink-0">
              <div className="flex items-center gap-2 text-violet-400">
                <FlaskConical size={15} />
                <span className="font-semibold text-sm">Simulação</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setSimSteps([]); setSimNodeAtivo(null) }}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                  title="Limpar"
                >
                  <RotateCcw size={14} />
                </button>
                <button onClick={() => setSimAberta(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {simSteps.length === 0 && !simRodando && (
                <div className="text-center py-8 text-zinc-600">
                  <FlaskConical size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Digite uma mensagem abaixo</p>
                  <p className="text-xs mt-1 opacity-60">e veja o fluxo executar passo a passo</p>
                </div>
              )}

              {simSteps.map((step, i) => {
                const cfg = NODE_CONFIG[step.nodeType]
                const Icon = SIM_ICON[step.nodeType] || (cfg?.icon)

                if (step.kind === 'mensagem') {
                  return (
                    <div key={i} className="flex justify-end">
                      <div className={`max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-sm ${
                        step.nodeType === 'ia'
                          ? 'bg-violet-600/20 text-violet-100 border border-violet-500/20'
                          : 'bg-green-600 text-white'
                      }`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{step.content}</p>
                        <p className="text-[10px] mt-1 opacity-60 text-right flex items-center justify-end gap-1">
                          {Icon && <Icon size={10} />}
                          {cfg?.label}
                        </p>
                      </div>
                    </div>
                  )
                }

                if (step.kind === 'erro') {
                  return (
                    <div key={i} className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      <XCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-red-300 text-xs">{step.content}</p>
                    </div>
                  )
                }

                return (
                  <div key={i} className="flex items-start gap-2 text-zinc-500 text-xs py-1">
                    {step.content.includes('✅') || step.content.includes('iniciado')
                      ? <CheckCircle2 size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                      : step.content.includes('❌')
                        ? <XCircle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                        : Icon
                          ? <Icon size={12} className="mt-0.5 flex-shrink-0" />
                          : <span className="w-3 h-3 rounded-full bg-zinc-700 mt-0.5 flex-shrink-0 inline-block" />
                    }
                    <span className="leading-relaxed">{step.content}</span>
                  </div>
                )
              })}

              {simRodando && (
                <div className="flex items-center gap-2 text-violet-400 text-xs py-1">
                  <Loader2 size={12} className="animate-spin" />
                  Executando...
                </div>
              )}
              <div ref={simEndRef} />
            </div>

            <div className="p-3 border-t border-zinc-800 flex-shrink-0">
              <p className="text-zinc-600 text-xs mb-2">Simular mensagem recebida:</p>
              <div className="flex gap-2">
                <input
                  value={simInput}
                  onChange={e => setSimInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !simRodando && executarSim()}
                  placeholder="Ex: oi, quero comprar..."
                  disabled={simRodando}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 disabled:opacity-50 transition-colors"
                />
                <button
                  onClick={executarSim}
                  disabled={simRodando || !simInput.trim()}
                  className="bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white p-2 rounded-lg transition-colors flex-shrink-0"
                >
                  {simRodando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ---- Painel de propriedades ---- */}
      {nodeSelecionado && !simAberta && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setNodeSelecionado(null)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-40 lg:static lg:z-auto">
            <PropertiesPanel
              node={{
                id: nodeSelecionado.id,
                type: nodeSelecionado.type as FluxoNodeType,
                position: nodeSelecionado.position,
                data: nodeSelecionado.data as FluxoNodeData,
              }}
              onClose={() => setNodeSelecionado(null)}
              onChange={atualizarNodeData}
              onDelete={removerNode}
            />
          </div>
        </>
      )}

      {/* ---- Modal de ajuda ---- */}
      {ajudaAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setAjudaAberta(false)} />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
              <div className="flex items-center gap-2.5 text-white">
                <BookOpen size={18} className="text-green-400" />
                <span className="font-bold text-base">Guia de uso dos Fluxos</span>
              </div>
              <button onClick={() => setAjudaAberta(false)} className="text-zinc-500 hover:text-white transition-colors p-1">
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo scrollável */}
            <div className="overflow-y-auto flex-1 p-5 space-y-6 text-sm">

              {/* Como funciona */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Workflow size={15} className="text-green-400 flex-shrink-0" />
                  <h2 className="font-bold text-white">Como funciona um Fluxo</h2>
                </div>
                <p className="text-zinc-400 leading-relaxed mb-3">
                  Um fluxo é uma sequência de nós conectados por linhas. Quando uma mensagem chega, o sistema executa os nós em ordem, do <span className="text-emerald-400 font-medium">Início</span> até o <span className="text-red-400 font-medium">Fim</span> (ou <span className="text-green-400 font-medium">Transferir</span>).
                </p>
                <div className="bg-zinc-800/60 rounded-xl p-3 flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
                  <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-medium">Início</span>
                  <span>→</span>
                  <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 font-medium">Texto / Imagem…</span>
                  <span>→</span>
                  <span className="px-2 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 font-medium">Condição</span>
                  <span>→</span>
                  <span className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 font-medium">Fim</span>
                </div>
              </section>

              {/* Variáveis */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Braces size={15} className="text-teal-400 flex-shrink-0" />
                  <h2 className="font-bold text-white">Variáveis</h2>
                </div>
                <p className="text-zinc-400 leading-relaxed mb-3">
                  Use <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-teal-300 font-mono text-xs">{'{{nome_variavel}}'}</code> em mensagens de texto para inserir valores dinâmicos em tempo de execução.
                </p>
                <div className="space-y-2">
                  {[
                    { variavel: '{{mensagem}}', desc: 'Última mensagem enviada pelo usuário' },
                    { variavel: '{{nome}}', desc: 'Exemplo: variável definida por você com o nó Variável' },
                  ].map(({ variavel, desc }) => (
                    <div key={variavel} className="flex items-start gap-3 bg-zinc-800/60 rounded-lg px-3 py-2">
                      <code className="font-mono text-xs text-teal-300 whitespace-nowrap mt-0.5">{variavel}</code>
                      <span className="text-zinc-400 text-xs">{desc}</span>
                    </div>
                  ))}
                </div>
                <p className="text-zinc-500 text-xs mt-3">
                  O nó <span className="text-teal-400">Variável</span> captura um valor (como <code className="bg-zinc-800 px-1 rounded font-mono">{'{{mensagem}}'}</code>) e salva com um nome que você escolhe para usar nos próximos nós.
                </p>
              </section>

              {/* Tipos de nós */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Plus size={15} className="text-blue-400 flex-shrink-0" />
                  <h2 className="font-bold text-white">Tipos de Nós</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.entries(NODE_CONFIG) as [FluxoNodeType, typeof NODE_CONFIG[FluxoNodeType]][]).map(([tipo, cfg]) => {
                    const Icon = cfg.icon
                    return (
                      <div key={tipo} className="flex items-start gap-2.5 bg-zinc-800/50 rounded-lg px-3 py-2.5">
                        <span className={`mt-0.5 flex-shrink-0 ${cfg.cor.split(' ').find(c => c.startsWith('text-')) || 'text-zinc-400'}`}>
                          <Icon size={13} />
                        </span>
                        <div>
                          <p className="font-medium text-zinc-200 text-xs">{cfg.label}</p>
                          <p className="text-zinc-500 text-xs mt-0.5">{cfg.descricao}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* Condições */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <GitBranch size={15} className="text-yellow-400 flex-shrink-0" />
                  <h2 className="font-bold text-white">Condições (bifurcações)</h2>
                </div>
                <p className="text-zinc-400 leading-relaxed mb-3">
                  O nó <span className="text-yellow-400 font-medium">Condição</span> cria dois caminhos no fluxo. Configure o que verificar e conecte cada saída:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5">
                    <p className="text-emerald-400 font-semibold text-xs mb-1">Saída Sim</p>
                    <p className="text-zinc-400 text-xs">Quando a condição é verdadeira. Conecte o handle <span className="text-emerald-400">verde</span> (esquerda).</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                    <p className="text-red-400 font-semibold text-xs mb-1">Saída Não</p>
                    <p className="text-zinc-400 text-xs">Quando a condição é falsa. Conecte o handle <span className="text-red-400">vermelho</span> (direita).</p>
                  </div>
                </div>
                <p className="text-zinc-500 text-xs mt-3">
                  Operadores disponíveis: <span className="text-zinc-300">contém</span>, <span className="text-zinc-300">é igual a</span>, <span className="text-zinc-300">começa com</span>, <span className="text-zinc-300">não contém</span>. Você pode verificar a mensagem do usuário ou o valor de uma variável.
                </p>
              </section>

              {/* Atalhos */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Keyboard size={15} className="text-zinc-400 flex-shrink-0" />
                  <h2 className="font-bold text-white">Atalhos e dicas</h2>
                </div>
                <div className="space-y-2">
                  {[
                    { tecla: 'Delete / Backspace', desc: 'Remove o nó selecionado (clique no nó primeiro)' },
                    { tecla: 'Hover no nó → 🗑', desc: 'Botão de remoção aparece ao passar o mouse' },
                    { tecla: 'Clique no nó', desc: 'Abre o painel de propriedades para editar o conteúdo' },
                    { tecla: 'Arrastar entre handles', desc: 'Cria uma conexão entre dois nós' },
                    { tecla: 'Scroll / Pinça', desc: 'Zoom no canvas' },
                    { tecla: 'Arrastar canvas vazio', desc: 'Move a visualização' },
                  ].map(({ tecla, desc }) => (
                    <div key={tecla} className="flex items-start gap-3">
                      <kbd className="bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-xs text-zinc-300 font-mono whitespace-nowrap flex-shrink-0 mt-0.5">{tecla}</kbd>
                      <span className="text-zinc-400 text-xs mt-1">{desc}</span>
                    </div>
                  ))}
                </div>
              </section>

            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-zinc-800 flex-shrink-0 flex items-center justify-between">
              <p className="text-zinc-600 text-xs">Use o botão <span className="text-violet-400">Testar</span> para simular o fluxo antes de ativar.</p>
              <button
                onClick={() => setAjudaAberta(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
