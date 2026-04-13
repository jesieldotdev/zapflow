'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Megaphone, Bot,
  Settings, LogOut, MessageCircle, Users, Inbox, GitFork, X
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/types'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/instancias', label: 'Números', icon: MessageCircle },
  { href: '/dashboard/chat', label: 'Chat', icon: Inbox },
  { href: '/dashboard/contatos', label: 'Contatos', icon: Users },
  { href: '/dashboard/campanhas', label: 'Campanhas', icon: Megaphone },
  { href: '/dashboard/chatbot', label: 'Chatbot IA', icon: Bot },
  { href: '/dashboard/fluxos', label: 'Fluxos', icon: GitFork },
  { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
]

const BADGE_PLANO: Record<string, string> = {
  free: 'bg-zinc-700 text-zinc-300',
  starter: 'bg-blue-500/20 text-blue-400',
  pro: 'bg-green-500/20 text-green-400',
  enterprise: 'bg-purple-500/20 text-purple-400',
}

export default function Sidebar({
  profile,
  isOpen,
  onClose,
}: {
  profile: Profile | null
  isOpen: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40
          lg:static lg:translate-x-0 lg:z-auto
          w-64 flex-shrink-0 border-r border-zinc-800 bg-zinc-900 flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-zinc-800 flex items-center justify-between font-bold text-lg">
          <div className="flex items-center gap-2">
            <MessageCircle className="text-green-500" size={22} />
            Zapvio
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-zinc-500 hover:text-white transition-colors p-1"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const ativo = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  ativo
                    ? 'bg-green-500/10 text-green-400'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Icon size={17} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Perfil */}
        <div className="p-3 border-t border-zinc-800">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-white truncate">{profile?.email}</p>
            <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${BADGE_PLANO[profile?.plano || 'free']}`}>
              {profile?.plano || 'free'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={17} />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
