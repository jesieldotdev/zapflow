import { createServerSupabase } from '@/lib/supabase-server'
import { MessageCircle, Megaphone, Bot, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: instancias }, { data: campanhas }, { data: conversas }, { data: mensagens }] = await Promise.all([
    supabase.from('instancias').select('id, status').eq('user_id', user.id),
    supabase.from('campanhas').select('id, status, enviados').eq('user_id', user.id),
    supabase.from('chatbot_conversas').select('id, status').in('instancia_id',
      (await supabase.from('instancias').select('id').eq('user_id', user.id)).data?.map(i => i.id) || []
    ),
    supabase.from('mensagens_log').select('id').eq('user_id', user.id)
  ])

  const conectados = instancias?.filter(i => i.status === 'conectado').length || 0
  const campanhasAtivas = campanhas?.filter(c => c.status === 'em_andamento').length || 0
  const totalEnviados = campanhas?.reduce((acc, c) => acc + (c.enviados || 0), 0) || 0
  const conversasAtivas = conversas?.filter(c => c.status === 'bot').length || 0

  const cards = [
    { label: 'Números conectados', valor: conectados, total: instancias?.length || 0, icon: MessageCircle, cor: 'text-green-400' },
    { label: 'Campanhas ativas', valor: campanhasAtivas, total: campanhas?.length || 0, icon: Megaphone, cor: 'text-blue-400' },
    { label: 'Mensagens enviadas', valor: totalEnviados, icon: TrendingUp, cor: 'text-purple-400' },
    { label: 'Conversas no chatbot', valor: conversasAtivas, icon: Bot, cor: 'text-orange-400' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400 text-sm mt-1">Visão geral da sua automação</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-zinc-400 text-sm">{c.label}</p>
              <c.icon className={c.cor} size={18} />
            </div>
            <p className="text-3xl font-bold text-white">{c.valor}</p>
            {c.total !== undefined && (
              <p className="text-zinc-500 text-xs mt-1">de {c.total} total</p>
            )}
          </div>
        ))}
      </div>

      {/* Campanhas recentes */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-4">Campanhas recentes</h2>
        {!campanhas?.length ? (
          <p className="text-zinc-500 text-sm">Nenhuma campanha criada ainda.</p>
        ) : (
          <div className="space-y-2">
            {campanhas.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                <span className="text-sm text-zinc-300">{c.id.slice(0, 8)}...</span>
                <StatusBadge status={c.status} />
                <span className="text-sm text-zinc-400">{c.enviados} enviados</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    rascunho: 'bg-zinc-700 text-zinc-300',
    em_andamento: 'bg-blue-500/20 text-blue-400',
    concluida: 'bg-green-500/20 text-green-400',
    pausada: 'bg-yellow-500/20 text-yellow-400',
    erro: 'bg-red-500/20 text-red-400',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || 'bg-zinc-700 text-zinc-300'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
