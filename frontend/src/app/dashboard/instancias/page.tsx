'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, Wifi, WifiOff, QrCode, Loader2, Trash2, RefreshCw } from 'lucide-react'
import type { Instancia } from '@/types'

export default function InstanciasPage() {
  const [instancias, setInstancias] = useState<Instancia[]>([])
  const [loading, setLoading] = useState(true)
  const [novoNome, setNovoNome] = useState('')
  const [criando, setCriando] = useState(false)
  const [qrModal, setQrModal] = useState<{ instanciaId: string; qr: string | null } | null>(null)
  const [conectando, setConectando] = useState<string | null>(null)
  const supabase = createClient()

  const carregar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('instancias')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setInstancias(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  async function criarInstancia() {
    if (!novoNome.trim()) return
    setCriando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('instancias').insert({
      user_id: user.id,
      nome: novoNome.trim(),
      status: 'desconectado'
    })

    setNovoNome('')
    await carregar()
    setCriando(false)
  }

  async function iniciarConexao(instanciaId: string) {
    setConectando(instanciaId)
    setQrModal({ instanciaId, qr: null })

    // Chama o backend via Next.js API route
    await fetch(`/api/qrcode/${instanciaId}`, { method: 'POST' })

    // Poll até ter QR
    let tentativas = 0
    const poll = setInterval(async () => {
      tentativas++
      if (tentativas > 20) {
        clearInterval(poll)
        setConectando(null)
        return
      }
      const res = await fetch(`/api/qrcode/${instanciaId}`)
      if (res.ok) {
        const { qrcode } = await res.json()
        if (qrcode) {
          setQrModal({ instanciaId, qr: qrcode })
          setConectando(null)
          clearInterval(poll)
          // Continua monitorando status
          monitorarConexao(instanciaId)
        }
      }
    }, 2000)
  }

  function monitorarConexao(instanciaId: string) {
    const channel = supabase
      .channel(`instancia-${instanciaId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'instancias',
        filter: `id=eq.${instanciaId}`
      }, (payload) => {
        if (payload.new.status === 'conectado') {
          setQrModal(null)
          carregar()
          supabase.removeChannel(channel)
        }
      })
      .subscribe()
  }

  const STATUS_CONFIG = {
    conectado: { label: 'Conectado', cor: 'text-green-400 bg-green-500/10', icon: Wifi },
    desconectado: { label: 'Desconectado', cor: 'text-zinc-400 bg-zinc-800', icon: WifiOff },
    conectando: { label: 'Conectando...', cor: 'text-yellow-400 bg-yellow-500/10', icon: RefreshCw },
    ban: { label: 'Banido', cor: 'text-red-400 bg-red-500/10', icon: WifiOff },
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Números WhatsApp</h1>
          <p className="text-zinc-400 text-sm mt-1">Gerencie suas instâncias conectadas</p>
        </div>
      </div>

      {/* Criar nova */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6 flex gap-3">
        <input
          value={novoNome}
          onChange={e => setNovoNome(e.target.value)}
          placeholder="Nome da instância (ex: Suporte, Vendas)"
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-green-500 transition-colors"
          onKeyDown={e => e.key === 'Enter' && criarInstancia()}
        />
        <button
          onClick={criarInstancia}
          disabled={criando || !novoNome.trim()}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
        >
          {criando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Criar
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-zinc-500" size={28} />
        </div>
      ) : !instancias.length ? (
        <div className="text-center py-20 text-zinc-500">
          <QrCode size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma instância criada ainda.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {instancias.map(inst => {
            const cfg = STATUS_CONFIG[inst.status] || STATUS_CONFIG.desconectado
            const IconStatus = cfg.icon
            return (
              <div key={inst.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.cor}`}>
                    <IconStatus size={13} />
                    {cfg.label}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{inst.nome}</p>
                    {inst.numero && (
                      <p className="text-zinc-400 text-sm">+{inst.numero}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {inst.status !== 'conectado' && (
                    <button
                      onClick={() => iniciarConexao(inst.id)}
                      disabled={conectando === inst.id}
                      className="flex items-center gap-2 border border-green-500/30 text-green-400 hover:bg-green-500/10 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                    >
                      {conectando === inst.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <QrCode size={14} />
                      }
                      Conectar via QR
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal QR Code */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setQrModal(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 text-center max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-2">Escanear QR Code</h2>
            <p className="text-zinc-400 text-sm mb-6">Abra o WhatsApp → Aparelhos conectados → Conectar aparelho</p>
            {qrModal.qr ? (
              <img src={qrModal.qr} alt="QR Code" className="w-64 h-64 mx-auto rounded-xl" />
            ) : (
              <div className="w-64 h-64 mx-auto bg-zinc-800 rounded-xl flex items-center justify-center">
                <Loader2 className="animate-spin text-zinc-500" size={32} />
              </div>
            )}
            <p className="text-zinc-500 text-xs mt-4">O QR Code expira em 60 segundos</p>
            <button
              onClick={() => setQrModal(null)}
              className="mt-4 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
