import Link from 'next/link'
import {
  MessageCircle, Zap, Bot, BarChart3,
  ShieldCheck, ArrowRight, CheckCircle2
} from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <nav className="border-b border-zinc-800 px-4 sm:px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2 font-bold text-lg sm:text-xl">
          <MessageCircle className="text-green-500" size={22} />
          ZapFlow
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Entrar
          </Link>
          <Link
            href="/login"
            className="text-sm bg-green-500 hover:bg-green-400 text-black font-semibold px-3 sm:px-4 py-2 rounded-lg transition-colors"
          >
            <span className="hidden sm:inline">Começar grátis</span>
            <span className="sm:hidden">Grátis</span>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 md:pt-24 pb-14 sm:pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 text-xs sm:text-sm px-3 py-1 rounded-full mb-6 sm:mb-8">
          <Zap size={13} />
          Automação WhatsApp com IA
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-5 sm:mb-6 tracking-tight">
          Escale seu negócio<br />
          <span className="text-green-500">via WhatsApp</span>
        </h1>
        <p className="text-base sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-8 sm:mb-10 px-2">
          Dispare campanhas em massa, configure um chatbot com IA e gerencie
          múltiplos números — tudo em um único painel.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-bold px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-base sm:text-lg transition-colors"
        >
          Criar conta grátis <ArrowRight size={18} />
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {[
          {
            icon: <Zap className="text-green-500" size={22} />,
            title: 'Disparo em Massa',
            desc: 'Envie mensagens para milhares de contatos com intervalos inteligentes para evitar bloqueios.'
          },
          {
            icon: <Bot className="text-green-500" size={22} />,
            title: 'Chatbot com IA',
            desc: 'Configure um assistente com Claude AI que responde clientes 24h, com prompt e horário customizáveis.'
          },
          {
            icon: <BarChart3 className="text-green-500" size={22} />,
            title: 'Analytics em tempo real',
            desc: 'Acompanhe taxa de entrega, conversas ativas e desempenho das campanhas ao vivo.'
          }
        ].map((f, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6">
            <div className="mb-3">{f.icon}</div>
            <h3 className="font-bold text-lg mb-2">{f.title}</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20 sm:pb-32">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">Planos simples, sem surpresas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {[
            {
              nome: 'Starter', preco: 'R$ 97', instancias: '1 número',
              recursos: ['Disparo em massa', 'Chatbot com IA', '5.000 msgs/mês', 'Suporte por email']
            },
            {
              nome: 'Pro', preco: 'R$ 197', instancias: '3 números', destaque: true,
              recursos: ['Tudo do Starter', '30.000 msgs/mês', 'Chatbot multi-instância', 'Suporte prioritário']
            },
            {
              nome: 'Enterprise', preco: 'R$ 497', instancias: '10 números',
              recursos: ['Tudo do Pro', 'Msgs ilimitadas', 'API access', 'Onboarding dedicado']
            }
          ].map((p, i) => (
            <div
              key={i}
              className={`rounded-2xl p-5 sm:p-6 border ${p.destaque
                ? 'bg-green-500 text-black border-green-400'
                : 'bg-zinc-900 border-zinc-800'
              }`}
            >
              <p className="font-semibold text-sm mb-1 opacity-70">{p.nome}</p>
              <p className="text-3xl sm:text-4xl font-extrabold mb-1">{p.preco}</p>
              <p className={`text-sm mb-5 sm:mb-6 ${p.destaque ? 'text-black/60' : 'text-zinc-400'}`}>
                /mês · {p.instancias}
              </p>
              <ul className="space-y-2 mb-5 sm:mb-6">
                {p.recursos.map((r, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 size={15} />
                    {r}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className={`block text-center font-semibold py-2.5 rounded-lg text-sm transition-colors ${
                  p.destaque
                    ? 'bg-black text-white hover:bg-zinc-900'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                }`}
              >
                Começar agora
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-6 sm:py-8 text-center text-zinc-500 text-sm px-4">
        © {new Date().getFullYear()} ZapFlow. Todos os direitos reservados.
      </footer>
    </main>
  )
}
