'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Users, Upload, Plus, Loader2, Search,
  Pencil, Trash2, Check, X, RefreshCw,
} from 'lucide-react'
import type { Contato } from '@/types'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || ''

function Avatar({ contato, size = 36 }: { contato: Contato; size?: number }) {
  const [err, setErr] = useState(false)
  const initials = (contato.nome || contato.numero)
    .trim()
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  const cores = [
    'bg-green-600', 'bg-blue-600', 'bg-violet-600',
    'bg-orange-600', 'bg-pink-600', 'bg-teal-600',
  ]
  const cor = cores[parseInt(contato.numero.slice(-1), 10) % cores.length]

  if (contato.foto_url && !err) {
    return (
      <img
        src={contato.foto_url}
        alt={initials}
        width={size}
        height={size}
        onError={() => setErr(true)}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className={`${cor} rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  )
}

export default function ContatosPage() {
  const [contatos, setContatos] = useState<Contato[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({ nome: '', numero: '' })
  const [salvando, setSalvando] = useState(false)

  // Rename inline
  const [renomeando, setRenomeando] = useState<string | null>(null)
  const [nomeEdit, setNomeEdit] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Refresh foto
  const [refreshing, setRefreshing] = useState<string | null>(null)

  const supabase = createClient()

  const carregar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('contatos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setContatos(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    if (renomeando) setTimeout(() => inputRef.current?.focus(), 50)
  }, [renomeando])

  // ── Adicionar manualmente ────────────────────────────────
  async function adicionarContato() {
    if (!form.numero.trim()) return
    setSalvando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const numero = form.numero.replace(/\D/g, '')
    await supabase.from('contatos').insert({
      user_id: user.id,
      nome: form.nome.trim() || null,
      numero,
    })
    setForm({ nome: '', numero: '' })
    setMostrarForm(false)
    await carregar()
    setSalvando(false)
  }

  // ── Importar CSV ─────────────────────────────────────────
  async function importarCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const text = await file.text()
    const linhas = text.split('\n').filter(l => l.trim())
    const novos = linhas
      .map(linha => {
        const [numero, nome] = linha.split(',').map(s => s.trim())
        return { user_id: user.id, numero: numero.replace(/\D/g, ''), nome: nome || null }
      })
      .filter(c => c.numero.length >= 10)
    if (novos.length) await supabase.from('contatos').insert(novos)
    await carregar()
    e.target.value = ''
  }

  // ── Renomear ─────────────────────────────────────────────
  function iniciarRename(c: Contato) {
    setRenomeando(c.id)
    setNomeEdit(c.nome || '')
  }

  async function confirmarRename(id: string) {
    await supabase
      .from('contatos')
      .update({ nome: nomeEdit.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', id)
    setContatos(prev =>
      prev.map(c => c.id === id ? { ...c, nome: nomeEdit.trim() || undefined } : c)
    )
    setRenomeando(null)
  }

  // ── Excluir ──────────────────────────────────────────────
  async function excluir(id: string) {
    if (!confirm('Remover este contato?')) return
    await supabase.from('contatos').delete().eq('id', id)
    setContatos(prev => prev.filter(c => c.id !== id))
  }

  // ── Refresh foto ─────────────────────────────────────────
  async function refreshFoto(contato: Contato) {
    if (!contato.instancia_id) return
    setRefreshing(contato.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BACKEND}/instancias/${contato.instancia_id}/foto-contato`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ numero: contato.numero }),
      })
      const json = await res.json()
      if (json.foto_url) {
        setContatos(prev =>
          prev.map(c => c.id === contato.id ? { ...c, foto_url: json.foto_url } : c)
        )
      }
    } catch {}
    setRefreshing(null)
  }

  const filtrados = contatos.filter(c =>
    c.numero.includes(busca) ||
    (c.nome || '').toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 md:mb-8 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Contatos</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {contatos.length} {contatos.length === 1 ? 'contato' : 'contatos'} — leads salvos automaticamente das conversas
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <label className="flex items-center gap-1.5 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors">
            <Upload size={15} />
            <span className="hidden sm:inline">Importar </span>CSV
            <input type="file" accept=".csv,.txt" className="hidden" onChange={importarCSV} />
          </label>
          <button
            onClick={() => setMostrarForm(v => !v)}
            className="flex items-center gap-1.5 bg-green-500 hover:bg-green-400 text-black font-semibold px-3 py-2.5 rounded-lg text-sm transition-colors"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Adicionar</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Form de adição manual */}
      {mostrarForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-5 mb-6 flex flex-col sm:flex-row gap-3">
          <input
            value={form.nome}
            onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
            placeholder="Nome (opcional)"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500"
          />
          <input
            value={form.numero}
            onChange={e => setForm(p => ({ ...p, numero: e.target.value }))}
            placeholder="Número (ex: 5511999999999)"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500"
            onKeyDown={e => e.key === 'Enter' && adicionarContato()}
          />
          <button
            onClick={adicionarContato}
            disabled={salvando}
            className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm"
          >
            {salvando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Salvar
          </button>
        </div>
      )}

      {/* Busca */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome ou número..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-green-500"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-zinc-500" size={28} />
        </div>
      ) : !filtrados.length ? (
        <div className="text-center py-20 text-zinc-500">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p>
            {busca
              ? 'Nenhum resultado encontrado.'
              : 'Nenhum contato ainda. Eles aparecem automaticamente quando alguém enviar uma mensagem.'}
          </p>
          {!busca && (
            <p className="text-xs mt-2 text-zinc-600">Você também pode importar CSV ou adicionar manualmente.</p>
          )}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3 w-12"></th>
                  <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Nome</th>
                  <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Número</th>
                  <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3 hidden sm:table-cell">Origem</th>
                  <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3 hidden md:table-cell">Salvo</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(c => (
                  <tr
                    key={c.id}
                    className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors group"
                  >
                    {/* Avatar */}
                    <td className="px-4 py-3">
                      <div className="relative inline-block">
                        <Avatar contato={c} size={36} />
                        {c.instancia_id && (
                          <button
                            onClick={() => refreshFoto(c)}
                            title="Atualizar foto do WhatsApp"
                            className="absolute -bottom-1 -right-1 bg-zinc-700 hover:bg-zinc-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {refreshing === c.id
                              ? <Loader2 size={10} className="animate-spin text-white" />
                              : <RefreshCw size={10} className="text-zinc-300" />
                            }
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Nome (editável) */}
                    <td className="px-4 py-3 text-sm text-white">
                      {renomeando === c.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            ref={inputRef}
                            value={nomeEdit}
                            onChange={e => setNomeEdit(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') confirmarRename(c.id)
                              if (e.key === 'Escape') setRenomeando(null)
                            }}
                            className="bg-zinc-800 border border-green-500 rounded px-2 py-1 text-sm text-white focus:outline-none w-36"
                          />
                          <button onClick={() => confirmarRename(c.id)} className="text-green-400 hover:text-green-300">
                            <Check size={14} />
                          </button>
                          <button onClick={() => setRenomeando(null)} className="text-zinc-500 hover:text-zinc-300">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span>
                            {c.nome || <span className="text-zinc-600 italic text-xs">sem nome</span>}
                          </span>
                          <button
                            onClick={() => iniciarRename(c)}
                            className="text-zinc-600 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Pencil size={12} />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Número */}
                    <td className="px-4 py-3 text-sm text-zinc-300 font-mono">
                      +{c.numero}
                    </td>

                    {/* Origem */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {c.instancia_id ? (
                        <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                          WhatsApp
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
                          Manual
                        </span>
                      )}
                    </td>

                    {/* Data */}
                    <td className="px-4 py-3 text-sm text-zinc-500 hidden md:table-cell">
                      {new Date(c.created_at).toLocaleDateString('pt-BR')}
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => excluir(c.id)}
                        className="text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
