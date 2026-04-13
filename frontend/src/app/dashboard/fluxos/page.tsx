'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  GitFork, Plus, Power, Pencil, Trash2,
  Loader2, Zap, MessageSquare, Copy, Download,
  Upload, ChevronDown, ChevronUp, LayoutTemplate, Check,
} from 'lucide-react'
import type { Fluxo, Instancia } from '@/types'
import { NODE_CONFIG } from '@/components/fluxos/FlowNodes'
import {
  TEMPLATES, CATEGORIA_LABEL, CATEGORIA_COR,
  encodeFluxoToken, decodeFluxoToken, remapearIds,
} from '@/components/fluxos/templates'

const TRIGGER_LABEL: Record<string, string> = {
  palavra_chave:     'Palavra-chave',
  qualquer_mensagem: 'Qualquer mensagem',
  primeiro_contato:  'Primeiro contato',
}

export default function FluxosPage() {
  const [fluxos, setFluxos] = useState<Fluxo[]>([])
  const [instancias, setInstancias] = useState<Instancia[]>([])
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({
    nome: '', instancia_ids: [] as string[],
    trigger_tipo: 'palavra_chave', trigger_valor: '',
  })
  const [mostrarForm, setMostrarForm] = useState(false)
  const [mostrarTemplates, setMostrarTemplates] = useState(false)
  const [mostrarImportar, setMostrarImportar] = useState(false)
  const [tokenImport, setTokenImport] = useState('')
  const [importando, setImportando] = useState(false)
  const [erroImport, setErroImport] = useState('')
  const [copiado, setCopiado] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const carregar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: fl }, { data: inst }] = await Promise.all([
      supabase.from('fluxos').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('instancias').select('*').eq('user_id', user.id).eq('status', 'conectado'),
    ])

    setFluxos(fl || [])
    setInstancias(inst || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  // ── Criar fluxo do zero ──────────────────────────────────
  async function criar() {
    if (!form.nome.trim()) return
    setCriando(true)
    setErro('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCriando(false); return }

    const { data, error } = await supabase
      .from('fluxos')
      .insert({
        user_id: user.id,
        instancia_ids: form.instancia_ids.length ? form.instancia_ids : null,
        nome: form.nome.trim(),
        trigger_tipo: form.trigger_tipo,
        trigger_valor: form.trigger_valor || null,
        ativo: false,
        nodes: [],
        edges: [],
      })
      .select()
      .single()

    setCriando(false)
    if (error) { setErro(error.message); return }
    if (data) router.push(`/dashboard/fluxos/${data.id}`)
  }

  // ── Usar template ────────────────────────────────────────
  async function usarTemplate(templateId: string) {
    const tpl = TEMPLATES.find(t => t.id === templateId)
    if (!tpl) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { nodes, edges } = remapearIds(tpl)

    const { data, error } = await supabase
      .from('fluxos')
      .insert({
        user_id: user.id,
        instancia_ids: null,
        nome: tpl.nome,
        trigger_tipo: tpl.trigger_tipo,
        trigger_valor: tpl.trigger_valor || null,
        ativo: false,
        nodes,
        edges,
      })
      .select()
      .single()

    if (!error && data) router.push(`/dashboard/fluxos/${data.id}`)
  }

  // ── Exportar token ───────────────────────────────────────
  function exportarToken(fluxo: Fluxo) {
    const token = encodeFluxoToken({
      nome: fluxo.nome,
      trigger_tipo: fluxo.trigger_tipo,
      trigger_valor: fluxo.trigger_valor || '',
      nodes: fluxo.nodes || [],
      edges: fluxo.edges || [],
    })
    navigator.clipboard.writeText(token)
    setCopiado(fluxo.id)
    setTimeout(() => setCopiado(null), 2000)
  }

  // ── Importar token ───────────────────────────────────────
  async function importarToken() {
    if (!tokenImport.trim()) return
    setImportando(true)
    setErroImport('')

    try {
      const tokenData = decodeFluxoToken(tokenImport)
      const { nodes, edges } = remapearIds(tokenData)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
        .from('fluxos')
        .insert({
          user_id: user.id,
          instancia_ids: null,
          nome: tokenData.nome + ' (importado)',
          trigger_tipo: tokenData.trigger_tipo || 'palavra_chave',
          trigger_valor: tokenData.trigger_valor || null,
          ativo: false,
          nodes,
          edges,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      if (data) router.push(`/dashboard/fluxos/${data.id}`)
    } catch (e: any) {
      setErroImport('Token inválido ou corrompido. Verifique e tente novamente.')
    } finally {
      setImportando(false)
    }
  }

  async function toggleAtivo(fluxo: Fluxo) {
    await supabase
      .from('fluxos')
      .update({ ativo: !fluxo.ativo, updated_at: new Date().toISOString() })
      .eq('id', fluxo.id)
    setFluxos(prev => prev.map(f => f.id === fluxo.id ? { ...f, ativo: !f.ativo } : f))
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este fluxo?')) return
    await supabase.from('fluxos').delete().eq('id', id)
    setFluxos(prev => prev.filter(f => f.id !== id))
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 md:mb-8 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Fluxos de Automação</h1>
          <p className="text-zinc-400 text-sm mt-1">Editor visual de automações com múltiplos tipos de mídia</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setMostrarImportar(v => !v); setMostrarTemplates(false); setMostrarForm(false) }}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-3.5 py-2.5 rounded-lg text-sm transition-colors border border-zinc-700"
          >
            <Upload size={14} />
            Importar
          </button>
          <button
            onClick={() => { setMostrarTemplates(v => !v); setMostrarImportar(false); setMostrarForm(false) }}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-3.5 py-2.5 rounded-lg text-sm transition-colors border border-zinc-700"
          >
            <LayoutTemplate size={14} />
            Templates
            {mostrarTemplates ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button
            onClick={() => { setMostrarForm(v => !v); setMostrarTemplates(false); setMostrarImportar(false) }}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors flex-shrink-0"
          >
            <Plus size={15} />
            Novo fluxo
          </button>
        </div>
      </div>

      {/* Importar via token */}
      {mostrarImportar && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-6 mb-6 space-y-4">
          <div>
            <h2 className="font-semibold text-white mb-1">Importar fluxo via token</h2>
            <p className="text-zinc-500 text-xs">Cole o token copiado de outro fluxo ou de outra conta</p>
          </div>
          <div className="flex gap-3 flex-wrap sm:flex-nowrap">
            <input
              value={tokenImport}
              onChange={e => { setTokenImport(e.target.value); setErroImport('') }}
              placeholder="Cole o token aqui..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-green-500 placeholder:text-zinc-600"
            />
            <button
              onClick={importarToken}
              disabled={importando || !tokenImport.trim()}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors flex-shrink-0"
            >
              {importando ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Importar
            </button>
          </div>
          {erroImport && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {erroImport}
            </p>
          )}
        </div>
      )}

      {/* Galeria de templates */}
      {mostrarTemplates && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-6 mb-6 space-y-4">
          <div>
            <h2 className="font-semibold text-white mb-1">Templates prontos</h2>
            <p className="text-zinc-500 text-xs">Escolha um template como ponto de partida e personalize</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {TEMPLATES.map(tpl => (
              <div
                key={tpl.id}
                className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4 flex flex-col gap-3 hover:border-zinc-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white text-sm">{tpl.nome}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${CATEGORIA_COR[tpl.categoria]}`}>
                    {CATEGORIA_LABEL[tpl.categoria]}
                  </span>
                </div>
                <p className="text-zinc-400 text-xs leading-relaxed">{tpl.descricao}</p>
                <div className="flex flex-wrap gap-1.5 mt-auto">
                  <span className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-md">
                    <Zap size={10} className="text-yellow-400" />
                    {TRIGGER_LABEL[tpl.trigger_tipo]}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-md">
                    <MessageSquare size={10} />
                    {tpl.nodes.length} nós
                  </span>
                </div>
                <button
                  onClick={() => usarTemplate(tpl.id)}
                  className="w-full bg-green-500/10 hover:bg-green-500/20 text-green-400 font-medium text-xs py-2 rounded-lg transition-colors border border-green-500/20 hover:border-green-500/40"
                >
                  Usar este template
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form de criação manual */}
      {mostrarForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-white">Novo Fluxo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Nome do fluxo</label>
              <input
                value={form.nome}
                onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                placeholder="ex: Boas-vindas, Suporte, Vendas"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500"
                onKeyDown={e => e.key === 'Enter' && criar()}
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Números WhatsApp</label>
              {instancias.length === 0 ? (
                <p className="text-zinc-500 text-sm py-2">Nenhuma instância conectada</p>
              ) : (
                <div className="space-y-2">
                  {instancias.map(i => (
                    <label key={i.id} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={form.instancia_ids.includes(i.id)}
                        onChange={e => setForm(p => ({
                          ...p,
                          instancia_ids: e.target.checked
                            ? [...p.instancia_ids, i.id]
                            : p.instancia_ids.filter(x => x !== i.id),
                        }))}
                        className="w-4 h-4 rounded accent-green-500"
                      />
                      <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">{i.nome}</span>
                    </label>
                  ))}
                  <p className="text-xs text-zinc-500 mt-1">Sem seleção = aplica em todas as instâncias</p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Gatilho</label>
              <select
                value={form.trigger_tipo}
                onChange={e => setForm(p => ({ ...p, trigger_tipo: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500"
              >
                <option value="palavra_chave">Palavra-chave</option>
                <option value="qualquer_mensagem">Qualquer mensagem</option>
                <option value="primeiro_contato">Primeiro contato</option>
              </select>
            </div>
            {form.trigger_tipo === 'palavra_chave' && (
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Palavra-chave</label>
                <input
                  value={form.trigger_valor}
                  onChange={e => setForm(p => ({ ...p, trigger_valor: e.target.value }))}
                  placeholder="ex: oi, preço, ajuda"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500"
                />
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={criar}
              disabled={criando || !form.nome.trim()}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              {criando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Criar e editar
            </button>
            <button onClick={() => setMostrarForm(false)} className="text-sm text-zinc-400 hover:text-white px-4">
              Cancelar
            </button>
          </div>
          {erro && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              Erro: {erro}
            </p>
          )}
        </div>
      )}

      {/* Lista de fluxos */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-zinc-500" size={28} />
        </div>
      ) : !fluxos.length ? (
        <div className="text-center py-20 text-zinc-600">
          <GitFork size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium text-zinc-500">Nenhum fluxo criado</p>
          <p className="text-sm mt-1 mb-5">Crie do zero ou use um template pronto</p>
          <button
            onClick={() => setMostrarTemplates(true)}
            className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors border border-zinc-700"
          >
            <LayoutTemplate size={14} />
            Ver templates
          </button>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {fluxos.map(f => {
            const instsSelecionadas = (f.instancia_ids || [])
              .map(id => instancias.find(i => i.id === id))
              .filter(Boolean)
            const qtdNodes = (f.nodes || []).length
            return (
              <div
                key={f.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-5 flex flex-col gap-4 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 pr-2">
                    <h3 className="font-semibold text-white truncate">{f.nome}</h3>
                    {f.descricao && <p className="text-zinc-500 text-xs mt-0.5">{f.descricao}</p>}
                  </div>
                  <button
                    onClick={() => toggleAtivo(f)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors flex-shrink-0 ${
                      f.ativo
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    <Power size={11} />
                    {f.ativo ? 'Ativo' : 'Inativo'}
                  </button>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-2">
                  <span className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded-md">
                    <Zap size={11} className="text-yellow-400" />
                    {TRIGGER_LABEL[f.trigger_tipo]}
                    {f.trigger_valor && `: "${f.trigger_valor}"`}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded-md">
                    <MessageSquare size={11} />
                    {qtdNodes} {qtdNodes === 1 ? 'nó' : 'nós'}
                  </span>
                  {instsSelecionadas.length > 0
                    ? instsSelecionadas.map(inst => (
                      <span key={inst!.id} className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded-md">
                        {inst!.nome}
                      </span>
                    ))
                    : (
                      <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-md">
                        Todas as instâncias
                      </span>
                    )
                  }
                </div>

                {/* Prévia dos nodes */}
                {qtdNodes > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(f.nodes || []).slice(0, 6).map(n => {
                      const cfg = NODE_CONFIG[n.type as keyof typeof NODE_CONFIG]
                      if (!cfg) return null
                      const Icon = cfg.icon
                      return (
                        <span key={n.id} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border ${cfg.cor} ${cfg.borda}`}>
                          <Icon size={10} />
                          {cfg.label}
                        </span>
                      )
                    })}
                    {qtdNodes > 6 && (
                      <span className="text-xs text-zinc-500">+{qtdNodes - 6}</span>
                    )}
                  </div>
                )}

                {/* Ações */}
                <div className="flex items-center gap-2 pt-1 border-t border-zinc-800">
                  <button
                    onClick={() => router.push(`/dashboard/fluxos/${f.id}`)}
                    className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 font-medium transition-colors"
                  >
                    <Pencil size={13} />
                    Editar
                  </button>
                  <button
                    onClick={() => exportarToken(f)}
                    title="Copiar token para compartilhar"
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    {copiado === f.id
                      ? <><Check size={13} className="text-green-400" /><span className="text-green-400">Copiado!</span></>
                      : <><Copy size={13} />Token</>
                    }
                  </button>
                  <button
                    onClick={() => excluir(f.id)}
                    className="ml-auto text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
