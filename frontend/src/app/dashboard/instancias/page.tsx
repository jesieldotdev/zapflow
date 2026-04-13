'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, Wifi, WifiOff, QrCode, Loader2, Trash2, RefreshCw, PowerOff, MoreVertical } from 'lucide-react'
import type { Instancia } from '@/types'

export default function InstanciasPage() {
  const [instancias, setInstancias] = useState<Instancia[]>([])
  const [loading, setLoading] = useState(true)
  const [novoNome, setNovoNome] = useState('')
  const [criando, setCriando] = useState(false)
  const [qrModal, setQrModal] = useState<{ instanciaId: string; qr: string | null } | null>(null)
  const [conectando, setConectando] = useState<string | null>(null)
  const [desconectando, setDesconectando] = useState<string | null>(null)
  const [deletando, setDeletando] = useState<string | null>(null)
  const [menuAberto, setMenuAberto] = useState<string | null>(null)
  const [erro, setErro] = useState('')
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

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('[data-menu]')) setMenuAberto(null)
    }
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [])

  async function criarInstancia() {
    if (!novoNome.trim()) return
    setCriando(true)
    setErro('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setErro('Usuário não autenticado'); setCriando(false); return }

    await supabase.from('profiles').upsert({ id: user.id, email: user.email! }, { onConflict: 'id' })

    const { error } = await supabase.from('instancias').insert({
      user_id: user.id,
      nome: novoNome.trim(),
      status: 'desconectado'
    })

    if (error) {
      setErro(error.message)
      setCriando(false)
      return
    }

    setNovoNome('')
    await carregar()
    setCriando(false)
  }

  async function desconectar(instanciaId: string) {
    setDesconectando(instanciaId)
    setMenuAberto(null)
    await fetch(`/api/instancias/${instanciaId}/desconectar`, { method: 'POST' })
    await carregar()
    setDesconectando(null)
  }

  async function deletarInstancia(instanciaId: string) {
    if (!confirm('Deletar esta instância? Isso remove todos os dados relacionados.')) return
    setDeletando(instanciaId)
    setMenuAberto(null)
    await supabase.from('instancias').delete().eq('id', instanciaId)
    await carregar()
    setDeletando(null)
  }

  async function iniciarConexao(instanciaId: string) {
    setConectando(instanciaId)
    setQrModal({ instanciaId, qr: null })

    await fetch(`/api/qrcode/${instanciaId}`, { method: 'POST' })

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
          clearInterval(pollStatus)
        }
      })
      .subscribe()

    const pollStatus = setInterval(async () => {
      const { data } = await supabase
        .from('instancias')
        .select('status')
        .eq('id', instanciaId)
        .single()

      if (data?.status === 'conectado') {
        setQrModal(null)
        carregar()
        supabase.removeChannel(channel)
        clearInterval(pollStatus)
      }
    }, 3000)

    setTimeout(() => {
      clearInterval(pollStatus)
      supabase.removeChannel(channel)
    }, 3 * 60 * 1000)
  }

  const STATUS_CONFIG = {
    conectado: { label: 'Conectado', cor: 'text-green-400 bg-green-500/10', icon: Wifi },
    desconectado: { label: 'Desconectado', cor: 'text-zinc-400 bg-zinc-800', icon: WifiOff },
    conectando: { label: 'Conectando...', cor: 'text-yellow-400 bg-yellow-500/10', icon: RefreshCw },
    ban: { label: 'Banido', cor: 'text-red-400 bg-red-500/10', icon: WifiOff },
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
      <div className="flex items-start justify-between mb-6 md:mb-8 gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Números WhatsApp</h1>
          <p className="text-zinc-400 text-sm mt-1">Gerencie suas instâncias conectadas</p>
        </div>
      </div>

      {/* Criar nova */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-5 mb-6 space-y-3">
        <div className="flex gap-3">
          <input
            value={novoNome}
            onChange={e => setNovoNome(e.target.value)}
            placeholder="Nome da instância (ex: Suporte, Vendas)"
            className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-green-500 transition-colors"
            onKeyDown={e => e.key === 'Enter' && criarInstancia()}
          />
          <button
            onClick={criarInstancia}
            disabled={criando || !novoNome.trim()}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors flex-shrink-0"
          >
            {criando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            <span className="hidden sm:inline">Criar</span>
            <span className="sm:hidden">OK</span>
          </button>
        </div>
        {erro && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            Erro: {erro}
          </p>
        )}
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
        <div className="grid gap-3 md:gap-4">
          {instancias.map(inst => {
            const cfg = STATUS_CONFIG[inst.status] || STATUS_CONFIG.desconectado
            const IconStatus = cfg.icon
            return (
              <div key={inst.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${cfg.cor}`}>
                      <IconStatus size={13} />
                      <span className="hidden sm:inline">{cfg.label}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{inst.nome}</p>
                      {inst.numero && (
                        <p className="text-zinc-400 text-sm">+{inst.numero}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {inst.status !== 'conectado' && (
                      <button
                        onClick={() => iniciarConexao(inst.id)}
                        disabled={conectando === inst.id}
                        className="flex items-center gap-1.5 border border-green-500/30 text-green-400 hover:bg-green-500/10 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                      >
                        {conectando === inst.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <QrCode size={14} />
                        }
                        <span className="hidden sm:inline">Conectar via QR</span>
                        <span className="sm:hidden">Conectar</span>
                      </button>
                    )}

                    {/* Menu de ações */}
                    <div className="relative" data-menu>
                      <button
                        onClick={() => setMenuAberto(menuAberto === inst.id ? null : inst.id)}
                        className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {menuAberto === inst.id && (
                        <div className="absolute right-0 top-9 z-20 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl min-w-[160px] overflow-hidden">
                          {inst.status === 'conectado' && (
                            <button
                              onClick={() => desconectar(inst.id)}
                              disabled={desconectando === inst.id}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-yellow-400 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                            >
                              {desconectando === inst.id
                                ? <Loader2 size={14} className="animate-spin" />
                                : <PowerOff size={14} />
                              }
                              Desconectar
                            </button>
                          )}
                          <button
                            onClick={() => deletarInstancia(inst.id)}
                            disabled={deletando === inst.id}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                          >
                            {deletando === inst.id
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Trash2 size={14} />
                            }
                            Deletar instância
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal QR Code */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setQrModal(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 md:p-8 text-center max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-2">Escanear QR Code</h2>
            <p className="text-zinc-400 text-sm mb-6">Abra o WhatsApp → Aparelhos conectados → Conectar aparelho</p>
            {qrModal.qr ? (
              <img src={qrModal.qr} alt="QR Code" className="w-56 h-56 md:w-64 md:h-64 mx-auto rounded-xl" />
            ) : (
              <div className="w-56 h-56 md:w-64 md:h-64 mx-auto bg-zinc-800 rounded-xl flex items-center justify-center">
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
