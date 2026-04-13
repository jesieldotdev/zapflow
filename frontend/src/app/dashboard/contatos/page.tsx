'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Users, Upload, Plus, Loader2, Search } from 'lucide-react'
import type { Contato } from '@/types'

export default function ContatosPage() {
  const [contatos, setContatos] = useState<Contato[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({ nome: '', numero: '' })
  const [salvando, setSalvando] = useState(false)
  const supabase = createClient()

  const carregar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('contatos').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setContatos(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  async function adicionarContato() {
    if (!form.numero.trim()) return
    setSalvando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const numero = form.numero.replace(/\D/g, '')
    await supabase.from('contatos').insert({ user_id: user.id, nome: form.nome, numero })
    setForm({ nome: '', numero: '' })
    setMostrarForm(false)
    await carregar()
    setSalvando(false)
  }

  async function importarCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const text = await file.text()
    const linhas = text.split('\n').filter(l => l.trim())
    const contatos = linhas.map(linha => {
      const [numero, nome] = linha.split(',').map(s => s.trim())
      return { user_id: user.id, numero: numero.replace(/\D/g, ''), nome: nome || '' }
    }).filter(c => c.numero.length >= 10)
    if (contatos.length) await supabase.from('contatos').insert(contatos)
    await carregar()
    e.target.value = ''
  }

  const filtrados = contatos.filter(c =>
    c.numero.includes(busca) || (c.nome || '').toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Contatos</h1>
          <p className="text-zinc-400 text-sm mt-1">{contatos.length} contatos cadastrados</p>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 px-4 py-2.5 rounded-lg text-sm cursor-pointer transition-colors">
            <Upload size={15} />Importar CSV
            <input type="file" accept=".csv,.txt" className="hidden" onChange={importarCSV} />
          </label>
          <button onClick={() => setMostrarForm(v => !v)}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
            <Plus size={15} />Adicionar
          </button>
        </div>
      </div>

      {mostrarForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6 flex gap-3">
          <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Nome (opcional)"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500" />
          <input value={form.numero} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} placeholder="Número (ex: 5511999999999)"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500" />
          <button onClick={adicionarContato} disabled={salvando}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm">
            {salvando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}Salvar
          </button>
        </div>
      )}

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou número..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-green-500" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-zinc-500" size={28} /></div>
      ) : !filtrados.length ? (
        <div className="text-center py-20 text-zinc-500">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p>{busca ? 'Nenhum resultado encontrado.' : 'Nenhum contato ainda. Importe um CSV ou adicione manualmente.'}</p>
          {!busca && <p className="text-xs mt-2 text-zinc-600">Formato CSV: numero,nome (uma por linha)</p>}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Nome</th>
                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Número</th>
                <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Adicionado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => (
                <tr key={c.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 text-sm text-white">{c.nome || <span className="text-zinc-600">—</span>}</td>
                  <td className="px-4 py-3 text-sm text-zinc-300 font-mono">+{c.numero}</td>
                  <td className="px-4 py-3 text-sm text-zinc-500">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
