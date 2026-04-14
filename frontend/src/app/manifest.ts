import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Zapvio — Automação WhatsApp',
    short_name: 'Zapvio',
    description: 'Disparo em massa e chatbot com IA para WhatsApp',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#25D366',
    orientation: 'portrait-primary',
    categories: ['productivity', 'business'],
    icons: [
      {
        src: '/icon/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Fluxos',
        url: '/dashboard/fluxos',
        description: 'Gerenciar fluxos de automação',
      },
      {
        name: 'Chat',
        url: '/dashboard/chat',
        description: 'Conversas em tempo real',
      },
    ],
  }
}
