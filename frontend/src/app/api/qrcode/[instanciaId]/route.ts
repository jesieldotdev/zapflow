// src/app/api/qrcode/[instanciaId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { backendFetch } from '@/lib/backend'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ instanciaId: string }> }
) {
  const { instanciaId } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const data = await backendFetch(`/instancias/${instanciaId}/qrcode`, user.id)
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 404 })
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ instanciaId: string }> }
) {
  const { instanciaId } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const data = await backendFetch(
      `/instancias/${instanciaId}/conectar`,
      user.id,
      { method: 'POST' }
    )
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
