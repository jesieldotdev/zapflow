'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Bot, Save, Loader2, Plus, X, Power } from 'lucide-react'
import type { Instancia, Chatbot } from '@/types'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MODELOS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku (rápido, econômico)' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet (mais inteligente)' },
]

export default function ChatbotPage() {
  const [instancias, setInstancias] = useState<Instancia[]>([])
  const [instanciaSel, setInstanciaSel] = useState<string>('')
  const [chatbot, setChatbot] = useState<Partial<Chatbot>>({
    ativo: false,
    nome_bot: 'Assistente',
    prompt_sistema: 'Você é um assistente prestativo e educado. Responda de forma concisa e clara em português.',
    modelo: 'claude-haiku-4-5-20251001',
    temperatura: 0.7,
    max_tokens: 500,
    palavras_saida: ['humano', 'atendente', 'pessoa'],
    horario_inicio: '08:00',
    horario_fim: '18:00',
    dias_semana: [1, 2, 3, 4, 5],
  })
  const [novaPalavra, setNovaPalavra] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: inst } = await supabase
        .from('instancias')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'conectado')
      setInstancias(inst || [])
      if (inst?.length) setInstanciaSel(inst[0].id)
    }
    carregar()
  }, [supabase])

  useEffect(() => {
    if (!instanciaSel) return
    async function carregarChatbot() {
      const { data } = await supabase
        .from('chatbots')
        .select('*')
        .eq('instancia_id', instanciaSel)
        .single()
      if (data) setChatbot(data)
    }
    carregarChatbot()
  }, [instanciaSel, supabase])

  async function salvar() {
    if (!instanciaSel) return
    setSalvando(true)
    setMsg('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      ...chatbot,
      instancia_id: instanciaSel,
      user_id: user.id,
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('chatbots')
      .upsert(payload, { onConflict: 'instancia_id' })

    setSalvando(false)
    setMsg(error ? 'Erro ao salvar: ' + error.message : 'Configurações salvas!')
    setTimeout(() => setMsg(''), 3000)
  }

  function toggleDia(dia: number) {
    const dias = chatbot.dias_semana || []
    setChatbot(prev => ({
      ...prev,
      dias_semana: dias.includes(dia) ? dias.filter(d => d !== dia) : [...dias, dia]
    }))
  }

  function adicionarPalavra() {
    if (!novaPalavra.trim()) return
    setChatbot(prev => ({
      ...prev,
      palavras_saida: [...(prev.palavras_saida || []), novaPalavra.trim()]
    }))
    setNovaPalavra('')
  }

  function removerPalavra(p: string) {
    setChatbot(prev => ({
      ...prev,
      palavras_saida: (prev.palavras_saida || []).filter(x => x !== p)
    }))
  }

  if (!instancias.length) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center">
        <Bot size={48} className="text-zinc-600 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Nenhum número conectado</h2>
        <p className="text-zinc-400">Conecte um número WhatsApp primeiro para configurar o chatbot.</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Bot className="text-green-500" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">Chatbot com IA</h1>
          <p className="text-zinc-400 text-sm">Responde clientes automaticamente com Claude</p>
        </div>
      </div>

      {/* Selecionar instância */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
        <label className="block text-sm font-medium text-zinc-300 mb-2">Número WhatsApp</label>
        <select
          value={instanciaSel}
          onChange={e => setInstanciaSel(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500"
        >
          {instancias.map(i => (
            <option key={i.id} value={i.id}>{i.nome} (+{i.numero})</option>
          ))}
        </select>
      </div>

      {/* Ativo / Inativo */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5 flex items-center justify-between">
        <div>
          <p className="font-medium text-white">Status do chatbot</p>
          <p className="text-zinc-400 text-sm">Ativar ou pausar o bot</p>
        </div>
        <button
          onClick={() => setChatbot(p => ({ ...p, ativo: !p.ativo }))}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            chatbot.ativo
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
          }`}
        >
          <Power size={15} />
          {chatbot.ativo ? 'Ativo' : 'Inativo'}
        </button>
      </div>

      {/* Prompt */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5 space-y-4">
        <h2 className="font-semibold text-white">Personalidade do Bot</h2>

        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">Nome do assistente</label>
          <input
            value={chatbot.nome_bot || ''}
            onChange={e => setChatbot(p => ({ ...p, nome_bot: e.target.value }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">Prompt do sistema</label>
          <textarea
            value={chatbot.prompt_sistema || ''}
            onChange={e => setChatbot(p => ({ ...p, prompt_sistema: e.target.value }))}
            rows={5}
            placeholder="Você é um assistente de atendimento da empresa X. Responda apenas sobre produtos e pedidos..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Modelo IA</label>
            <select
              value={chatbot.modelo || ''}
              onChange={e => setChatbot(p => ({ ...p, modelo: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500"
            >
              {MODELOS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Máx. tokens resposta</label>
            <input
              type="number"
              min={100} max={2000}
              value={chatbot.max_tokens || 500}
              onChange={e => setChatbot(p => ({ ...p, max_tokens: Number(e.target.value) }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500"
            />
          </div>
        </div>
      </div>

      {/* Horário */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5 space-y-4">
        <h2 className="font-semibold text-white">Horário de Atendimento</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Início</label>
            <input
              type="time"
              value={chatbot.horario_inicio || '08:00'}
              onChange={e => setChatbot(p => ({ ...p, horario_inicio: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Fim</label>
            <input
              type="time"
              value={chatbot.horario_fim || '18:00'}
              onChange={e => setChatbot(p => ({ ...p, horario_fim: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-2">Dias da semana</label>
          <div className="flex gap-2 flex-wrap">
            {DIAS.map((dia, i) => (
              <button
                key={i}
                onClick={() => toggleDia(i)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  chatbot.dias_semana?.includes(i)
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}
              >
                {dia}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Palavras de saída */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6 space-y-3">
        <h2 className="font-semibold text-white">Palavras para falar com humano</h2>
        <p className="text-zinc-400 text-xs">Quando o cliente digitar essas palavras, o bot para e avisa que vai transferir.</p>
        <div className="flex flex-wrap gap-2">
          {chatbot.palavras_saida?.map(p => (
            <span key={p} className="flex items-center gap-1.5 bg-zinc-800 text-zinc-300 text-sm px-2.5 py-1 rounded-lg">
              {p}
              <button onClick={() => removerPalavra(p)} className="text-zinc-500 hover:text-red-400 transition-colors">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={novaPalavra}
            onChange={e => setNovaPalavra(e.target.value)}
            placeholder="Nova palavra-chave..."
            onKeyDown={e => e.key === 'Enter' && adicionarPalavra()}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
          />
          <button
            onClick={adicionarPalavra}
            className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      {/* Salvar */}
      {msg && (
        <p className={`text-sm mb-4 p-3 rounded-lg ${
          msg.includes('Erro')
            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
            : 'bg-green-500/10 text-green-400 border border-green-500/20'
        }`}>
          {msg}
        </p>
      )}
      <button
        onClick={salvar}
        disabled={salvando}
        className="flex items-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold px-6 py-3 rounded-xl transition-colors"
      >
        {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Salvar configurações
      </button>
    </div>
  )
}
