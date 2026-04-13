'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Settings, Save, Loader2 } from 'lucide-react'
import type { Profile } from '@/types'

const BADGE: Record<string, string> = {
  free: 'bg-zinc-700 text-zinc-300',
  starter: 'bg-blue-500/20 text-blue-400',
  pro: 'bg-green-500/20 text-green-400',
  enterprise: 'bg-purple-500/20 text-purple-400',
}

export default function ConfiguracoesPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [nome, setNome] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) { setProfile(data); setNome(data.nome || '') }
    }
    carregar()
  }, [supabase])

  async function salvar() {
    if (!profile) return
    setSalvando(true); setMsg('')
    const { error } = await supabase.from('profiles').update({ nome }).eq('id', profile.id)
    setSalvando(false)
    setMsg(error ? 'Erro ao salvar.' : 'Perfil atualizado!')
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div className="p-8 max-w-lg">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="text-green-500" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">Configurações</h1>
          <p className="text-zinc-400 text-sm">Gerencie seu perfil e plano</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-5 space-y-4">
        <h2 className="font-semibold text-white">Perfil</h2>
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">Nome</label>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500" />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">Email</label>
          <input value={profile?.email || ''} disabled
            className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-500 cursor-not-allowed" />
        </div>
        {msg && (
          <p className={`text-sm p-3 rounded-lg ${msg.includes('Erro') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>{msg}</p>
        )}
        <button onClick={salvar} disabled={salvando}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors">
          {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Salvar
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-4">Plano atual</h2>
        <div className="flex items-center justify-between mb-4">
          <span className={`text-sm font-semibold px-3 py-1 rounded-full capitalize ${BADGE[profile?.plano || 'free']}`}>
            {profile?.plano || 'free'}
          </span>
          <span className="text-zinc-400 text-sm">{profile?.instancias_max || 1} número(s) incluído(s)</span>
        </div>
        <div className={`text-sm px-3 py-2 rounded-lg ${profile?.ativo ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {profile?.ativo ? '✓ Acesso ativo' : '✗ Acesso inativo — adquira um plano para ativar'}
        </div>
      </div>
    </div>
  )
}
