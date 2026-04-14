import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { backendFetch } from '@/lib/backend'

// Solicitar pairing code — inicia conexão com número de telefone
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ instanciaId: string }> }
) {
  const { instanciaId } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { telefone } = await req.json()
  if (!telefone) return NextResponse.json({ error: 'telefone é obrigatório' }, { status: 400 })

  try {
    const data = await backendFetch(`/instancias/${instanciaId}/pairing-code`, user.id, {
      method: 'POST',
      body: JSON.stringify({ telefone }),
    })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Buscar pairing code gerado
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ instanciaId: string }> }
) {
  const { instanciaId } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const data = await backendFetch(`/instancias/${instanciaId}/pairing-code`, user.id)
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 404 })
  }
}
