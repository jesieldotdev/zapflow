'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  GitFork, Plus, Power, Pencil, Trash2,
  Loader2, Zap, MessageSquare
} from 'lucide-react'
import type { Fluxo, Instancia } from '@/types'
import { NODE_CONFIG } from '@/components/fluxos/FlowNodes'

const TRIGGER_LABEL: Record<string, string> = {
  palavra_chave:      'Palavra-chave',
  qualquer_mensagem:  'Qualquer mensagem',
  primeiro_contato:   'Primeiro contato',
}

export default function FluxosPage() {
  const [fluxos, setFluxos] = useState<Fluxo[]>([])
  const [instancias, setInstancias] = useState<Instancia[]>([])
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({ nome: '', instancia_ids: [] as string[], trigger_tipo: 'palavra_chave', trigger_valor: '' })
  const [mostrarForm, setMostrarForm] = useState(false)
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
    if (error) {
      setErro(error.message)
      return
    }
    if (data) router.push(`/dashboard/fluxos/${data.id}`)
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
      <div className="flex items-start justify-between mb-6 md:mb-8 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Fluxos de Automação</h1>
          <p className="text-zinc-400 text-sm mt-1">Editor visual de automações com múltiplos tipos de mídia</p>
        </div>
        <button
          onClick={() => setMostrarForm(v => !v)}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors flex-shrink-0"
        >
          <Plus size={15} />
          Novo fluxo
        </button>
      </div>

      {/* Form de criação */}
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
                            : p.instancia_ids.filter(x => x !== i.id)
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
          <p className="text-sm mt-1">Crie seu primeiro fluxo de automação</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {fluxos.map(f => {
            const instsSelecionadas = (f.instancia_ids || []).map(id => instancias.find(i => i.id === id)).filter(Boolean)
            const qtdNodes = (f.nodes || []).length
            return (
              <div key={f.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-5 flex flex-col gap-4 hover:border-zinc-700 transition-colors">
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
                    Editar fluxo
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
