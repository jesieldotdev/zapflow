'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Megaphone, Plus, Play, Pause, Loader2,
  CheckCircle2, AlertCircle, Clock
} from 'lucide-react'
import type { Campanha, Instancia } from '@/types'

const STATUS_CFG: Record<string, { label: string; cor: string; icon: any }> = {
  rascunho:     { label: 'Rascunho',      cor: 'text-zinc-400 bg-zinc-800',         icon: Clock },
  em_andamento: { label: 'Em andamento',  cor: 'text-blue-400 bg-blue-500/10',      icon: Loader2 },
  concluida:    { label: 'Concluída',     cor: 'text-green-400 bg-green-500/10',    icon: CheckCircle2 },
  pausada:      { label: 'Pausada',       cor: 'text-yellow-400 bg-yellow-500/10',  icon: Pause },
  erro:         { label: 'Erro',          cor: 'text-red-400 bg-red-500/10',        icon: AlertCircle },
}

export default function CampanhasPage() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [instancias, setInstancias] = useState<Instancia[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [disparando, setDisparando] = useState<string | null>(null)
  const [form, setForm] = useState({
    nome: '', mensagem: '', instancia_id: '',
    intervalo_min_seg: 5, intervalo_max_seg: 15,
    numeros: ''
  })
  const supabase = createClient()

  const carregar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: camps }, { data: inst }] = await Promise.all([
      supabase.from('campanhas').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('instancias').select('*').eq('user_id', user.id).eq('status', 'conectado')
    ])

    setCampanhas(camps || [])
    setInstancias(inst || [])
    if (inst?.length && !form.instancia_id) {
      setForm(p => ({ ...p, instancia_id: inst[0].id }))
    }
    setLoading(false)
  }, [supabase, form.instancia_id])

  useEffect(() => { carregar() }, [carregar])

  async function criarCampanha() {
    if (!form.nome || !form.mensagem || !form.instancia_id) return
    setSalvando(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const numeros = form.numeros
      .split('\n')
      .map(n => n.trim().replace(/\D/g, ''))
      .filter(n => n.length >= 10)

    const { data: campanha, error } = await supabase
      .from('campanhas')
      .insert({
        user_id: user.id,
        nome: form.nome,
        mensagem: form.mensagem,
        instancia_id: form.instancia_id,
        intervalo_min_seg: form.intervalo_min_seg,
        intervalo_max_seg: form.intervalo_max_seg,
        total_contatos: numeros.length,
        status: 'rascunho'
      })
      .select()
      .single()

    if (error || !campanha) { setSalvando(false); return }

    if (numeros.length) {
      await supabase.from('campanha_contatos').insert(
        numeros.map(numero => ({
          campanha_id: campanha.id,
          numero,
          status: 'pendente'
        }))
      )
    }

    setMostrarForm(false)
    setForm({ nome: '', mensagem: '', instancia_id: instancias[0]?.id || '', intervalo_min_seg: 5, intervalo_max_seg: 15, numeros: '' })
    await carregar()
    setSalvando(false)
  }

  async function disparar(campanhaId: string) {
    setDisparando(campanhaId)
    try {
      const res = await fetch(`/api/campanhas/${campanhaId}/disparar`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) alert(data.error)
      else await carregar()
    } catch (e) {
      alert('Erro ao disparar campanha')
    }
    setDisparando(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
      <div className="flex items-start justify-between mb-6 md:mb-8 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Campanhas</h1>
          <p className="text-zinc-400 text-sm mt-1">Disparo em massa com intervalos anti-ban</p>
        </div>
        <button
          onClick={() => setMostrarForm(v => !v)}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors flex-shrink-0"
        >
          <Plus size={15} />
          Nova campanha
        </button>
      </div>

      {/* Formulário */}
      {mostrarForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-white">Nova Campanha</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Nome da campanha</label>
              <input
                value={form.nome}
                onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                placeholder="Ex: Promoção Abril"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Número WhatsApp</label>
              <select
                value={form.instancia_id}
                onChange={e => setForm(p => ({ ...p, instancia_id: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500"
              >
                {instancias.map(i => (
                  <option key={i.id} value={i.id}>{i.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">
              Mensagem <span className="text-zinc-600">(use {'{{nome}}'}, {'{{cidade}}'} para personalizar)</span>
            </label>
            <textarea
              value={form.mensagem}
              onChange={e => setForm(p => ({ ...p, mensagem: e.target.value }))}
              rows={4}
              placeholder="Olá {{nome}}! Temos uma promoção especial para você..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Números (um por linha, apenas dígitos)</label>
            <textarea
              value={form.numeros}
              onChange={e => setForm(p => ({ ...p, numeros: e.target.value }))}
              rows={5}
              placeholder={'5511999999999\n5521888888888\n5531777777777'}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-green-500 resize-none"
            />
            <p className="text-zinc-500 text-xs mt-1">
              {form.numeros.split('\n').filter(n => n.trim().replace(/\D/g, '').length >= 10).length} números válidos
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Intervalo mínimo (seg)</label>
              <input
                type="number" min={3} max={60}
                value={form.intervalo_min_seg}
                onChange={e => setForm(p => ({ ...p, intervalo_min_seg: Number(e.target.value) }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Intervalo máximo (seg)</label>
              <input
                type="number" min={5} max={120}
                value={form.intervalo_max_seg}
                onChange={e => setForm(p => ({ ...p, intervalo_max_seg: Number(e.target.value) }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={criarCampanha}
              disabled={salvando}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              {salvando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Criar campanha
            </button>
            <button
              onClick={() => setMostrarForm(false)}
              className="text-sm text-zinc-400 hover:text-white transition-colors px-4"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-zinc-500" size={28} />
        </div>
      ) : !campanhas.length ? (
        <div className="text-center py-20 text-zinc-500">
          <Megaphone size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma campanha criada ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campanhas.map(c => {
            const cfg = STATUS_CFG[c.status] || STATUS_CFG.rascunho
            const IconStatus = cfg.icon
            const progresso = c.total_contatos > 0
              ? Math.round((c.enviados / c.total_contatos) * 100)
              : 0

            return (
              <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-5">
                <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{c.nome}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      {c.total_contatos} contatos · {c.intervalo_min_seg}–{c.intervalo_max_seg}s
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.cor}`}>
                      <IconStatus size={11} className={c.status === 'em_andamento' ? 'animate-spin' : ''} />
                      {cfg.label}
                    </span>
                    {(c.status === 'rascunho' || c.status === 'pausada') && (
                      <button
                        onClick={() => disparar(c.id)}
                        disabled={disparando === c.id}
                        className="flex items-center gap-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      >
                        {disparando === c.id
                          ? <Loader2 size={11} className="animate-spin" />
                          : <Play size={11} />
                        }
                        Disparar
                      </button>
                    )}
                  </div>
                </div>

                {/* Progresso */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${progresso}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400 flex-shrink-0">
                    {c.enviados}/{c.total_contatos}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
