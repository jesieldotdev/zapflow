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
  Play, MessageSquare, Image, Music, FileText,
  Link, GitBranch, Clock, Bot, Variable, UserCheck,
  StopCircle, Plus, ChevronDown, ChevronUp
} from 'lucide-react'
import type { Fluxo, FluxoNodeType, FluxoNodeData } from '@/types'
import { makeNodeTypes, NODE_CONFIG } from '@/components/fluxos/FlowNodes'
import PropertiesPanel from '@/components/fluxos/PropertiesPanel'

// Paleta de nodes para adicionar ao canvas
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

export default function FluxoEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [fluxo, setFluxo] = useState<Fluxo | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [nodeSelecionado, setNodeSelecionado] = useState<Node | null>(null)
  const [paletaAberta, setPaletaAberta] = useState(true)
  const [grupoAberto, setGrupoAberto] = useState<string>('Mensagens')

  const nodeTypes = useMemo(() => makeNodeTypes(), [])

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Carrega fluxo
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('fluxos')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) { router.push('/dashboard/fluxos'); return }
      setFluxo(data)

      // Converte nodes/edges do banco para o formato ReactFlow
      const rNodes: Node[] = (data.nodes || []).map((n: any) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: { ...n.data, nodeType: n.type },
        selected: false,
      }))
      const rEdges: Edge[] = (data.edges || []).map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        label: e.label,
        animated: e.animated ?? true,
        style: { stroke: '#4ade80', strokeWidth: 1.5 },
        labelStyle: { fill: '#a1a1aa', fontSize: 11 },
      }))

      setNodes(rNodes)
      setEdges(rEdges)
      setLoading(false)
    }
    load()
  }, [id])

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({
      ...connection,
      animated: true,
      style: { stroke: '#4ade80', strokeWidth: 1.5 },
    }, eds))
  }, [setEdges])

  function adicionarNode(tipo: FluxoNodeType) {
    const id = newId()
    const node: Node = {
      id,
      type: tipo,
      position: { x: 300 + Math.random() * 100, y: 200 + Math.random() * 100 },
      data: { nodeType: tipo } as FluxoNodeData & { nodeType: FluxoNodeType },
    }
    setNodes(ns => [...ns, node])
  }

  function atualizarNodeData(nodeId: string, partial: Partial<FluxoNodeData>) {
    setNodes(ns => ns.map(n => n.id === nodeId
      ? { ...n, data: { ...n.data, ...partial } }
      : n
    ))
    if (nodeSelecionado?.id === nodeId) {
      setNodeSelecionado(prev => prev ? { ...prev, data: { ...prev.data, ...partial } } : prev)
    }
  }

  async function salvar() {
    if (!fluxo) return
    setSalvando(true)

    // Serializa nodes/edges de volta para o formato do banco
    const nodesParaSalvar = nodes.map(n => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: Object.fromEntries(
        Object.entries(n.data).filter(([k]) => k !== 'nodeType')
      ),
    }))

    const edgesParaSalvar = edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      label: e.label,
      animated: e.animated,
    }))

    await supabase
      .from('fluxos')
      .update({
        nodes: nodesParaSalvar,
        edges: edgesParaSalvar,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fluxo.id)

    setSalvando(false)
  }

  async function toggleAtivo() {
    if (!fluxo) return
    const novoAtivo = !fluxo.ativo
    await supabase.from('fluxos').update({ ativo: novoAtivo }).eq('id', fluxo.id)
    setFluxo(f => f ? { ...f, ativo: novoAtivo } : f)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <Loader2 className="animate-spin text-zinc-500" size={32} />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">

      {/* ---- Paleta esquerda ---- */}
      <div className="w-56 flex-shrink-0 border-r border-zinc-800 bg-zinc-900 flex flex-col overflow-hidden">
        <button
          onClick={() => setPaletaAberta(v => !v)}
          className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2"><Plus size={14} /> Adicionar nó</span>
          {paletaAberta ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {paletaAberta && (
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
                        onClick={() => adicionarNode(tipo)}
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
        )}
      </div>

      {/* ---- Canvas ---- */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard/fluxos')}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="font-bold text-white">{fluxo?.nome}</h1>
              <p className="text-zinc-500 text-xs">{nodes.length} nós · {edges.length} conexões</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAtivo}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                fluxo?.ativo
                  ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
              }`}
            >
              <Power size={13} />
              {fluxo?.ativo ? 'Ativo' : 'Inativo'}
            </button>
            <button
              onClick={salvar}
              disabled={salvando}
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold text-sm px-4 py-1.5 rounded-lg transition-colors"
            >
              {salvando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Salvar
            </button>
          </div>
        </div>

        {/* ReactFlow canvas */}
        <div className="flex-1 overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setNodeSelecionado(node)}
            onPaneClick={() => setNodeSelecionado(null)}
            fitView
            colorMode="dark"
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: '#4ade80', strokeWidth: 1.5 },
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#27272a"
            />
            <Controls
              style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }}
            />
            <MiniMap
              style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }}
              nodeColor="#27272a"
              maskColor="rgba(0,0,0,0.6)"
            />
            {nodes.length === 0 && (
              <Panel position="top-center">
                <div className="bg-zinc-800/90 border border-zinc-700 rounded-xl px-5 py-4 text-center mt-8 backdrop-blur-sm">
                  <p className="text-zinc-300 font-medium">Canvas vazio</p>
                  <p className="text-zinc-500 text-sm mt-1">Adicione nós pela paleta à esquerda</p>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>

      {/* ---- Painel de propriedades (direita) ---- */}
      {nodeSelecionado && (
        <PropertiesPanel
          node={fluxo ? {
            id: nodeSelecionado.id,
            type: nodeSelecionado.type as FluxoNodeType,
            position: nodeSelecionado.position,
            data: nodeSelecionado.data as FluxoNodeData,
          } : null}
          onClose={() => setNodeSelecionado(null)}
          onChange={atualizarNodeData}
        />
      )}
    </div>
  )
}
