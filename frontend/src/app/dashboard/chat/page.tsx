'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Bot, User, Send, Loader2, Phone, RefreshCw,
  MessageSquare, Search, X, Paperclip,
  UserCheck, BotMessageSquare, CircleOff, Trash2
} from 'lucide-react'
import type { ChatbotConversa, MensagemConversa, StatusConversa } from '@/types'

const STATUS_BADGE: Record<StatusConversa, { label: string; cor: string }> = {
  bot:       { label: 'Bot',     cor: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  humano:    { label: 'Humano',  cor: 'bg-green-500/20 text-green-400 border-green-500/30' },
  encerrado: { label: 'Encerrado', cor: 'bg-zinc-700 text-zinc-400 border-zinc-600' },
}

const FILTROS: { value: StatusConversa | 'todos'; label: string }[] = [
  { value: 'todos',    label: 'Todas' },
  { value: 'humano',  label: 'Humano' },
  { value: 'bot',     label: 'Bot' },
  { value: 'encerrado', label: 'Encerradas' },
]

function formatHora(ts: string) {
  const d = new Date(ts)
  const hoje = new Date()
  const ontem = new Date(hoje)
  ontem.setDate(hoje.getDate() - 1)

  if (d.toDateString() === hoje.toDateString()) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  if (d.toDateString() === ontem.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatHoraCompleto(ts: string) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function ultimaMensagem(conversa: ChatbotConversa) {
  const msgs = conversa.mensagens || []
  if (!msgs.length) return 'Sem mensagens'
  return msgs[msgs.length - 1].content.slice(0, 60)
}

export default function ChatPage() {
  const [conversas, setConversas] = useState<ChatbotConversa[]>([])
  const [conversa, setConversa] = useState<ChatbotConversa | null>(null)
  const [filtro, setFiltro] = useState<StatusConversa | 'todos'>('todos')
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mudandoStatus, setMudandoStatus] = useState(false)
  const [deletando, setDeletando] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Carrega conversas
  const carregar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Busca instâncias do usuário
    const { data: instancias } = await supabase
      .from('instancias')
      .select('id')
      .eq('user_id', user.id)

    if (!instancias?.length) { setLoading(false); return }

    const ids = instancias.map(i => i.id)

    const { data } = await supabase
      .from('chatbot_conversas')
      .select('*')
      .in('instancia_id', ids)
      .order('updated_at', { ascending: false })

    setConversas(data || [])
    setLoading(false)

    // Atualiza conversa aberta se mudou
    if (conversa) {
      const atualizada = (data || []).find(c => c.id === conversa.id)
      if (atualizada) setConversa(atualizada)
    }
  }, [supabase, conversa?.id])

  useEffect(() => { carregar() }, [])

  // Realtime — escuta mudanças nas conversas
  useEffect(() => {
    const channel = supabase
      .channel('conversas-inbox')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chatbot_conversas',
      }, () => {
        carregar()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, carregar])

  // Scroll automático para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversa?.mensagens])

  const conversasFiltradas = conversas.filter(c => {
    if (filtro !== 'todos' && c.status !== filtro) return false
    if (busca) {
      const q = busca.toLowerCase()
      return c.numero.includes(q) || (c.nome_contato || '').toLowerCase().includes(q)
    }
    return true
  })

  async function enviar() {
    if (!texto.trim() || !conversa) return
    setEnviando(true)
    const msg = texto.trim()
    setTexto('')

    // Atimista: adiciona na UI imediatamente
    const novaMsg: MensagemConversa = {
      role: 'assistant',
      content: msg,
      from_human: true,
      timestamp: new Date().toISOString(),
    }
    setConversa(prev => prev ? {
      ...prev,
      mensagens: [...(prev.mensagens || []), novaMsg]
    } : prev)

    try {
      const res = await fetch(`/api/chat/${conversa.id}/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: msg }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert('Erro ao enviar: ' + err.error)
        // Reverte
        setConversa(prev => prev ? {
          ...prev,
          mensagens: (prev.mensagens || []).filter(m => m !== novaMsg)
        } : prev)
      }
    } catch {
      alert('Erro de conexão')
    }
    setEnviando(false)
  }

  async function deletarConversa() {
    if (!conversa) return
    if (!confirm('Deletar esta conversa? O histórico será perdido.')) return
    setDeletando(true)
    await supabase.from('chatbot_conversas').delete().eq('id', conversa.id)
    setConversas(prev => prev.filter(c => c.id !== conversa.id))
    setConversa(null)
    setDeletando(false)
  }

  async function mudarStatus(status: StatusConversa) {
    if (!conversa) return
    setMudandoStatus(true)
    await fetch(`/api/chat/${conversa.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setConversa(prev => prev ? { ...prev, status } : prev)
    setConversas(prev => prev.map(c => c.id === conversa.id ? { ...c, status } : c))
    setMudandoStatus(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">

      {/* ---- Coluna esquerda: lista de conversas ---- */}
      <div className="w-80 flex-shrink-0 border-r border-zinc-800 flex flex-col">

        {/* Header lista */}
        <div className="p-4 border-b border-zinc-800">
          <h1 className="font-bold text-white text-lg mb-3">Conversas</h1>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar número ou nome..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-green-500"
            />
            {busca && (
              <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                <X size={13} />
              </button>
            )}
          </div>
          {/* Filtros */}
          <div className="flex gap-1 flex-wrap">
            {FILTROS.map(f => (
              <button
                key={f.value}
                onClick={() => setFiltro(f.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filtro === f.value
                    ? 'bg-green-500/20 text-green-400'
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-zinc-500" size={24} />
            </div>
          ) : !conversasFiltradas.length ? (
            <div className="text-center py-12 text-zinc-600">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma conversa</p>
            </div>
          ) : (
            conversasFiltradas.map(c => {
              const badge = STATUS_BADGE[c.status]
              const ativa = conversa?.id === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => setConversa(c)}
                  className={`w-full text-left px-4 py-3.5 border-b border-zinc-800/50 hover:bg-zinc-900 transition-colors ${
                    ativa ? 'bg-zinc-900 border-l-2 border-l-green-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                        <Phone size={13} className="text-zinc-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white text-sm truncate">
                          {c.nome_contato || c.numero}
                        </p>
                        {c.nome_contato && (
                          <p className="text-zinc-500 text-xs">{c.numero}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <span className="text-zinc-500 text-xs">
                        {formatHora(c.updated_at)}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${badge.cor}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                  <p className="text-zinc-500 text-xs truncate ml-10">
                    {ultimaMensagem(c)}
                  </p>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ---- Coluna direita: conversa aberta ---- */}
      {conversa ? (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Header da conversa */}
          <div className="px-5 py-3.5 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center">
                <Phone size={14} className="text-zinc-400" />
              </div>
              <div>
                <p className="font-semibold text-white">
                  {conversa.nome_contato || conversa.numero}
                </p>
                {conversa.nome_contato && (
                  <p className="text-zinc-500 text-xs">{conversa.numero}</p>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_BADGE[conversa.status].cor}`}>
                {STATUS_BADGE[conversa.status].label}
              </span>
            </div>

            {/* Ações de status */}
            <div className="flex items-center gap-2">
              {conversa.status === 'bot' && (
                <button
                  onClick={() => mudarStatus('humano')}
                  disabled={mudandoStatus}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                >
                  {mudandoStatus ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={13} />}
                  Assumir atendimento
                </button>
              )}
              {conversa.status === 'humano' && (
                <>
                  <button
                    onClick={() => mudarStatus('bot')}
                    disabled={mudandoStatus}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                  >
                    {mudandoStatus ? <Loader2 size={12} className="animate-spin" /> : <BotMessageSquare size={13} />}
                    Devolver pro bot
                  </button>
                  <button
                    onClick={() => mudarStatus('encerrado')}
                    disabled={mudandoStatus}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                  >
                    <CircleOff size={13} />
                    Encerrar
                  </button>
                </>
              )}
              {conversa.status === 'encerrado' && (
                <button
                  onClick={() => mudarStatus('bot')}
                  disabled={mudandoStatus}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={13} />
                  Reabrir
                </button>
              )}
              <button
                onClick={deletarConversa}
                disabled={deletando}
                className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                title="Deletar conversa"
              >
                {deletando ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {(conversa.mensagens || []).length === 0 ? (
              <div className="flex items-center justify-center h-full text-zinc-600">
                <p className="text-sm">Nenhuma mensagem ainda</p>
              </div>
            ) : (
              (conversa.mensagens || []).map((msg, i) => {
                const isBot = msg.role === 'assistant' && !msg.from_human
                const isHuman = msg.role === 'assistant' && msg.from_human
                const isContato = msg.role === 'user'

                return (
                  <div
                    key={i}
                    className={`flex ${isContato ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`flex items-end gap-2 max-w-[70%] ${isContato ? 'flex-row' : 'flex-row-reverse'}`}>
                      {/* Avatar */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mb-1 ${
                        isContato ? 'bg-zinc-700' : isBot ? 'bg-blue-500/20' : 'bg-green-500/20'
                      }`}>
                        {isContato
                          ? <User size={11} className="text-zinc-400" />
                          : isBot
                            ? <Bot size={11} className="text-blue-400" />
                            : <UserCheck size={11} className="text-green-400" />
                        }
                      </div>
                      {/* Bubble */}
                      <div className={`rounded-2xl px-4 py-2.5 text-sm max-w-full ${
                        isContato
                          ? 'bg-zinc-800 text-white rounded-bl-sm'
                          : isBot
                            ? 'bg-blue-600/20 text-blue-100 border border-blue-500/20 rounded-br-sm'
                            : 'bg-green-600 text-white rounded-br-sm'
                      }`}>
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                        <p className={`text-xs mt-1 ${
                          isContato ? 'text-zinc-500' : isBot ? 'text-blue-300/60' : 'text-green-100/60'
                        }`}>
                          {formatHoraCompleto(msg.timestamp)}
                          {isBot && ' · Bot'}
                          {isHuman && ' · Você'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input de resposta */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-900">
            {conversa.status === 'encerrado' ? (
              <p className="text-center text-zinc-600 text-sm py-2">
                Conversa encerrada — reabra para enviar mensagens
              </p>
            ) : conversa.status === 'bot' ? (
              <div className="flex items-center gap-3 text-zinc-500 text-sm py-2">
                <Bot size={16} className="text-blue-400" />
                <span>Bot está respondendo. Clique em <strong className="text-white">Assumir atendimento</strong> para responder manualmente.</span>
              </div>
            ) : (
              <div className="flex gap-3">
                <button className="text-zinc-500 hover:text-zinc-300 transition-colors mt-1">
                  <Paperclip size={18} />
                </button>
                <textarea
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      enviar()
                    }
                  }}
                  placeholder="Digite uma mensagem... (Enter para enviar, Shift+Enter para nova linha)"
                  rows={2}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-green-500 resize-none transition-colors"
                />
                <button
                  onClick={enviar}
                  disabled={enviando || !texto.trim()}
                  className="self-end bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black p-2.5 rounded-xl transition-colors"
                >
                  {enviando
                    ? <Loader2 size={16} className="animate-spin" />
                    : <Send size={16} />
                  }
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
          <MessageSquare size={48} className="mb-3 opacity-30" />
          <p className="text-lg font-medium">Selecione uma conversa</p>
          <p className="text-sm mt-1 opacity-60">Escolha uma conversa na lista ao lado</p>
        </div>
      )}
    </div>
  )
}
