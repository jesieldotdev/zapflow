// src/app/api/webhook/route.ts — Webhook Kiwify
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const PLANO_POR_PRODUTO: Record<string, { plano: string; instancias: number }> = {
  'STARTER': { plano: 'starter', instancias: 1 },
  'PRO':     { plano: 'pro',     instancias: 3 },
  'ENTERPRISE': { plano: 'enterprise', instancias: 10 },
}

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await req.text()

  // Verifica assinatura Kiwify
  const signature = req.headers.get('x-kiwify-signature') || ''
  const expected = crypto
    .createHmac('sha256', process.env.KIWIFY_SECRET!)
    .update(body)
    .digest('hex')

  if (signature !== expected) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
  }

  const payload = JSON.parse(body)

  // Log do webhook
  await supabase.from('webhook_logs').insert({
    provider: 'kiwify',
    evento: payload.event,
    payload
  })

  const email = payload.Customer?.email
  const produtoNome = payload.Product?.name?.toUpperCase() || 'STARTER'
  const config = PLANO_POR_PRODUTO[produtoNome] || PLANO_POR_PRODUTO['STARTER']

  if (!email) {
    return NextResponse.json({ error: 'Email não encontrado' }, { status: 400 })
  }

  if (payload.event === 'order.approved' || payload.event === 'subscription.active') {
    // Libera acesso — atualiza pelo email
    await supabase
      .from('profiles')
      .update({
        ativo: true,
        plano: config.plano,
        instancias_max: config.instancias
      })
      .eq('email', email)
  }

  if (payload.event === 'subscription.canceled' || payload.event === 'subscription.overdue') {
    await supabase
      .from('profiles')
      .update({ ativo: false, plano: 'free' })
      .eq('email', email)
  }

  return NextResponse.json({ ok: true })
}
