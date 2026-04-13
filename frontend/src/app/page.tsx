import Link from 'next/link'
import {
  MessageCircle, Zap, Bot, BarChart3, ShieldCheck,
  ArrowRight, CheckCircle2, GitBranch, Users, Clock,
  Sparkles, Send, PhoneCall, Star, ChevronRight,
  Workflow, BrainCircuit, Megaphone, Globe, Lock,
  TrendingUp, HeadphonesIcon, Timer, BadgeCheck
} from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold text-lg sm:text-xl">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <MessageCircle size={16} className="text-black" />
            </div>
            Zapvio
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
            <a href="#precos" className="hover:text-white transition-colors">Preços</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Entrar
            </Link>
            <Link
              href="/login"
              className="text-sm bg-green-500 hover:bg-green-400 text-black font-bold px-4 py-2 rounded-lg transition-all hover:scale-105"
            >
              Testar 7 dias grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 text-center">
        {/* glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-green-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/25 text-green-400 text-xs sm:text-sm px-4 py-1.5 rounded-full mb-8">
          <Sparkles size={13} />
          Plataforma de automação WhatsApp com IA
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.08] mb-6 tracking-tight">
          Seu WhatsApp no<br />
          <span className="text-green-500">piloto automático</span>
        </h1>

        <p className="text-base sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Crie fluxos visuais de atendimento, dispare campanhas em massa e deixe a IA
          responder por você — sem código, sem complicação.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-bold px-8 py-4 rounded-xl text-base sm:text-lg transition-all hover:scale-105 shadow-lg shadow-green-500/20 w-full sm:w-auto justify-center"
          >
            Começar grátis por 7 dias <ArrowRight size={18} />
          </Link>
          <a
            href="#como-funciona"
            className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold px-8 py-4 rounded-xl text-base sm:text-lg transition-colors w-full sm:w-auto justify-center"
          >
            Ver como funciona
          </a>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
          {[
            { value: '+50 mil', label: 'mensagens enviadas' },
            { value: '99,9%', label: 'uptime garantido' },
            { value: '7 dias', label: 'grátis, sem cartão' },
          ].map((s, i) => (
            <div key={i} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
              <p className="text-xl sm:text-2xl font-extrabold text-green-400">{s.value}</p>
              <p className="text-zinc-500 text-xs sm:text-sm mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section id="como-funciona" className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-12">
          <p className="text-green-400 text-sm font-semibold uppercase tracking-widest mb-3">Como funciona</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold">Configurado em minutos</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* connector line */}
          <div className="hidden md:block absolute top-10 left-[33%] right-[33%] h-px bg-gradient-to-r from-zinc-800 via-green-500/40 to-zinc-800" />

          {[
            {
              step: '01',
              icon: <PhoneCall size={22} className="text-green-400" />,
              title: 'Conecte seu número',
              desc: 'Escaneie o QR Code e seu WhatsApp fica online na plataforma em segundos.'
            },
            {
              step: '02',
              icon: <Workflow size={22} className="text-green-400" />,
              title: 'Monte seus fluxos',
              desc: 'Use o editor visual drag-and-drop para criar jornadas de atendimento sem escrever código.'
            },
            {
              step: '03',
              icon: <Zap size={22} className="text-green-400" />,
              title: 'Automatize tudo',
              desc: 'Campanhas, chatbot com IA e fluxos rodam sozinhos enquanto você foca no negócio.'
            },
          ].map((item, i) => (
            <div key={i} className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-green-500/30 transition-colors">
              <span className="absolute top-4 right-4 text-zinc-700 font-extrabold text-2xl">{item.step}</span>
              <div className="w-11 h-11 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
                {item.icon}
              </div>
              <h3 className="font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Destaque: Fluxo Visual ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-3xl p-8 sm:p-12 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 text-xs px-3 py-1 rounded-full mb-5">
              <GitBranch size={12} /> Editor visual de fluxos
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-5 leading-tight">
              Monte jornadas de atendimento<br />
              <span className="text-green-400">sem escrever uma linha</span>
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-6">
              Arrastar e soltar. Conectar nós. Publicar. Seu fluxo de vendas ou suporte
              automatizado fica pronto em minutos com o editor visual da Zapvio.
            </p>
            <ul className="space-y-3">
              {[
                'Gatilhos por palavra-chave ou primeiro contato',
                'Nós de mensagem, espera, condição e API',
                'Transferência para atendimento humano',
                'Horário de funcionamento configurável',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                  <CheckCircle2 size={15} className="text-green-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Mock visual de fluxo */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 font-mono text-xs space-y-2 select-none">
            {[
              { type: 'trigger', label: '⚡ Gatilho: "oi", "olá", "quero"', color: 'border-green-500/40 bg-green-500/5 text-green-300' },
              { type: 'arrow', label: '' },
              { type: 'node', label: '💬 Enviar: "Olá! Como posso ajudar?"', color: 'border-zinc-600 bg-zinc-900 text-zinc-300' },
              { type: 'arrow', label: '' },
              { type: 'condition', label: '🔀 Condição: horário comercial?', color: 'border-yellow-500/40 bg-yellow-500/5 text-yellow-300' },
              { type: 'arrow', label: '' },
              { type: 'node', label: '🤖 IA: responder automaticamente', color: 'border-blue-500/40 bg-blue-500/5 text-blue-300' },
              { type: 'arrow', label: '' },
              { type: 'node', label: '👤 Transferir para humano', color: 'border-zinc-600 bg-zinc-900 text-zinc-400' },
            ].map((item, i) =>
              item.type === 'arrow' ? (
                <div key={i} className="flex justify-center text-zinc-600">│</div>
              ) : (
                <div key={i} className={`border rounded-lg px-3 py-2 ${item.color}`}>
                  {item.label}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ── Destaque: Chatbot IA ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-3xl p-8 sm:p-12 grid md:grid-cols-2 gap-10 items-center">
          {/* Mock chat */}
          <div className="order-2 md:order-1 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Bot size={14} className="text-black" />
              </div>
              <div>
                <p className="text-sm font-semibold">Assistente IA</p>
                <p className="text-xs text-green-400">● online agora</p>
              </div>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div className="bg-zinc-800 rounded-xl rounded-tl-sm px-3 py-2 max-w-[80%] text-zinc-300">
                Oi, quero saber sobre os planos
              </div>
              <div className="bg-green-500/15 border border-green-500/20 rounded-xl rounded-tr-sm px-3 py-2 max-w-[85%] ml-auto text-green-200">
                Olá! Temos 3 planos a partir de R$ 47/mês. O Starter inclui disparo em massa, chatbot com IA e fluxos automáticos. Quer que eu te explique cada um? 😊
              </div>
              <div className="bg-zinc-800 rounded-xl rounded-tl-sm px-3 py-2 max-w-[80%] text-zinc-300">
                Qual tem mais números?
              </div>
              <div className="bg-green-500/15 border border-green-500/20 rounded-xl rounded-tr-sm px-3 py-2 max-w-[85%] ml-auto text-green-200">
                O Business te dá até 10 números simultâneos com mensagens ilimitadas. E você ainda pode testar 7 dias grátis! 🚀
              </div>
              <div className="flex gap-1 pl-1">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>

          <div className="order-1 md:order-2">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs px-3 py-1 rounded-full mb-5">
              <BrainCircuit size={12} /> Chatbot com IA (Claude AI)
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-5 leading-tight">
              IA que atende<br />
              <span className="text-blue-400">24h por dia, 7 por 7</span>
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-6">
              Integrado com Claude AI, o chatbot da Zapvio aprende sobre seu negócio
              e responde com naturalidade — como se fosse você mesmo digitando.
            </p>
            <ul className="space-y-3">
              {[
                'Prompt personalizado com seu negócio',
                'Histórico de conversa por cliente',
                'Horário de atendimento automático',
                'Palavras-chave para acionar humano',
                'Nunca deixa cliente sem resposta',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                  <CheckCircle2 size={15} className="text-blue-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Todas as funcionalidades ── */}
      <section id="funcionalidades" className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-14">
          <p className="text-green-400 text-sm font-semibold uppercase tracking-widest mb-3">Tudo incluso</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Uma plataforma, todas as ferramentas</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">Sem precisar de integrações caras ou ferramentas separadas. Tudo que você precisa já está aqui.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: <Megaphone size={20} className="text-green-400" />,
              title: 'Disparo em Massa',
              desc: 'Envie para milhares de contatos com intervalos inteligentes que evitam banimentos.'
            },
            {
              icon: <Workflow size={20} className="text-green-400" />,
              title: 'Fluxos Visuais',
              desc: 'Editor drag-and-drop com gatilhos, condições, mensagens e integrações via API.'
            },
            {
              icon: <BrainCircuit size={20} className="text-green-400" />,
              title: 'Chatbot com IA',
              desc: 'Claude AI responde clientes com naturalidade, 24 horas por dia, 7 dias por semana.'
            },
            {
              icon: <Users size={20} className="text-green-400" />,
              title: 'Multi-instâncias',
              desc: 'Gerencie vários números de WhatsApp no mesmo painel, com status em tempo real.'
            },
            {
              icon: <BarChart3 size={20} className="text-green-400" />,
              title: 'Analytics Completo',
              desc: 'Acompanhe campanhas, conversas ativas, taxa de entrega e desempenho geral.'
            },
            {
              icon: <Clock size={20} className="text-green-400" />,
              title: 'Agendamento',
              desc: 'Programe campanhas para o horário ideal e defina horários de atendimento do bot.'
            },
            {
              icon: <Send size={20} className="text-green-400" />,
              title: 'Fila Inteligente',
              desc: 'Mensagens enviadas com delay humanizado para proteger sua conta de bloqueios.'
            },
            {
              icon: <Globe size={20} className="text-green-400" />,
              title: 'Webhook & API',
              desc: 'Integre com seu CRM, loja ou sistema externo via webhooks e chamadas de API.'
            },
            {
              icon: <ShieldCheck size={20} className="text-green-400" />,
              title: 'Anti-ban nativo',
              desc: 'Intervalos aleatórios, simulação humana e limites seguros de envio automáticos.'
            },
          ].map((f, i) => (
            <div
              key={i}
              className="group bg-zinc-900 border border-zinc-800 hover:border-green-500/30 rounded-2xl p-5 transition-all hover:bg-zinc-900/80"
            >
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-500/15 transition-colors">
                {f.icon}
              </div>
              <h3 className="font-bold mb-1.5">{f.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Comparativo ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="text-center mb-10">
          <p className="text-green-400 text-sm font-semibold uppercase tracking-widest mb-3">Por que Zapvio?</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold">Mais por menos</h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-3 bg-zinc-800/50 px-6 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
            <span>Recurso</span>
            <span className="text-center text-zinc-500">Concorrentes</span>
            <span className="text-center text-green-400">Zapvio</span>
          </div>
          {[
            ['Fluxo visual', false, true],
            ['Chatbot com IA', false, true],
            ['Disparo em massa', true, true],
            ['Multi-instâncias', 'pago extra', true],
            ['API/Webhook', 'plano caro', true],
            ['Anti-ban nativo', false, true],
            ['Trial gratuito', '3 dias', '7 dias'],
            ['Preço inicial', 'R$ 149/mês', 'R$ 47/mês'],
          ].map(([feature, competitors, zapvio], i) => (
            <div key={i} className={`grid grid-cols-3 px-6 py-4 text-sm border-t border-zinc-800/60 ${i % 2 === 0 ? '' : 'bg-zinc-900/50'}`}>
              <span className="text-zinc-300">{feature}</span>
              <span className="text-center">
                {competitors === false
                  ? <span className="text-zinc-600">✗</span>
                  : <span className="text-zinc-400">{competitors === true ? <span className="text-zinc-300">✓</span> : competitors}</span>
                }
              </span>
              <span className="text-center font-semibold">
                {zapvio === true
                  ? <span className="text-green-400">✓</span>
                  : <span className="text-green-400">{zapvio}</span>
                }
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="precos" className="max-w-5xl mx-auto px-4 sm:px-6 pb-20 sm:pb-32">
        <div className="text-center mb-12">
          <p className="text-green-400 text-sm font-semibold uppercase tracking-widest mb-3">Preços</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Simples e honesto</h2>
          <p className="text-zinc-400">7 dias grátis em todos os planos. Sem cartão de crédito para começar.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-start">
          {[
            {
              nome: 'Starter',
              preco: 'R$ 47',
              periodo: '/mês',
              numeros: '1 número',
              desc: 'Para quem está começando a automatizar o atendimento.',
              recursos: [
                'Fluxos visuais ilimitados',
                'Chatbot com IA (Claude)',
                'Disparo em massa',
                '10.000 mensagens/mês',
                'Anti-ban nativo',
                'Suporte por chat',
              ],
              destaque: false,
              cta: 'Começar grátis'
            },
            {
              nome: 'Pro',
              preco: 'R$ 97',
              periodo: '/mês',
              numeros: '3 números',
              desc: 'Para negócios em crescimento que precisam de mais alcance.',
              badge: 'Mais popular',
              recursos: [
                'Tudo do Starter',
                '3 números simultâneos',
                '50.000 mensagens/mês',
                'Webhook & API',
                'Agendamento de campanhas',
                'Suporte prioritário',
              ],
              destaque: true,
              cta: 'Começar grátis'
            },
            {
              nome: 'Business',
              preco: 'R$ 197',
              periodo: '/mês',
              numeros: '10 números',
              desc: 'Para agências e empresas com alto volume de atendimento.',
              recursos: [
                'Tudo do Pro',
                '10 números simultâneos',
                'Mensagens ilimitadas',
                'Onboarding dedicado',
                'API com acesso total',
                'SLA garantido',
              ],
              destaque: false,
              cta: 'Começar grátis'
            }
          ].map((p, i) => (
            <div
              key={i}
              className={`relative rounded-2xl p-6 border ${p.destaque
                ? 'bg-green-500 text-black border-green-400 shadow-2xl shadow-green-500/20 scale-105'
                : 'bg-zinc-900 border-zinc-800'
              }`}
            >
              {p.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-green-400 text-xs font-bold px-3 py-1 rounded-full border border-green-500/30">
                  {p.badge}
                </div>
              )}
              <p className={`font-semibold text-sm mb-1 ${p.destaque ? 'text-black/60' : 'text-zinc-400'}`}>{p.nome}</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-extrabold">{p.preco}</span>
                <span className={`text-sm mb-1 ${p.destaque ? 'text-black/60' : 'text-zinc-400'}`}>{p.periodo}</span>
              </div>
              <p className={`text-xs mb-1 font-medium ${p.destaque ? 'text-black/70' : 'text-green-400'}`}>{p.numeros}</p>
              <p className={`text-xs mb-5 leading-relaxed ${p.destaque ? 'text-black/60' : 'text-zinc-500'}`}>{p.desc}</p>

              <div className={`flex items-center gap-1.5 text-xs font-semibold mb-5 ${p.destaque ? 'text-black/70' : 'text-green-400'}`}>
                <Timer size={12} />
                7 dias grátis · sem cartão
              </div>

              <ul className="space-y-2.5 mb-6">
                {p.recursos.map((r, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 size={14} className={p.destaque ? 'text-black' : 'text-green-400'} />
                    {r}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className={`block text-center font-bold py-3 rounded-xl text-sm transition-all hover:scale-105 ${
                  p.destaque
                    ? 'bg-black text-white hover:bg-zinc-900'
                    : 'bg-green-500 hover:bg-green-400 text-black'
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-zinc-500 text-xs mt-8">
          Precisa de volume maior? <a href="mailto:contato@zapvio.com.br" className="text-green-400 hover:underline">Fale com a gente</a>
        </p>
      </section>

      {/* ── CTA final ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-24 text-center">
        <div className="bg-gradient-to-br from-green-500/10 to-zinc-900 border border-green-500/20 rounded-3xl p-10 sm:p-14">
          <div className="w-14 h-14 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Zap size={28} className="text-green-400" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            Pronto para automatizar?
          </h2>
          <p className="text-zinc-400 mb-8 max-w-md mx-auto">
            Comece seu teste gratuito de 7 dias agora. Sem cartão, sem contrato, sem complicação.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-bold px-10 py-4 rounded-xl text-lg transition-all hover:scale-105 shadow-lg shadow-green-500/20"
          >
            Criar conta grátis <ArrowRight size={20} />
          </Link>
          <p className="text-zinc-600 text-xs mt-4">7 dias grátis · cancele quando quiser</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-800 py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold">
            <div className="w-6 h-6 bg-green-500 rounded-md flex items-center justify-center">
              <MessageCircle size={12} className="text-black" />
            </div>
            Zapvio
          </div>
          <p className="text-zinc-500 text-sm">© {new Date().getFullYear()} Zapvio. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <a href="#" className="hover:text-zinc-300 transition-colors">Termos</a>
            <a href="#" className="hover:text-zinc-300 transition-colors">Privacidade</a>
            <a href="mailto:contato@zapvio.com.br" className="hover:text-zinc-300 transition-colors">Contato</a>
          </div>
        </div>
      </footer>

    </main>
  )
}
