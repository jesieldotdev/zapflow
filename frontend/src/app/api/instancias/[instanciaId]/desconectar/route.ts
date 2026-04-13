import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { backendFetch } from '@/lib/backend'

export async function POST(
  _req: NextRequest,
  { params }: { params: { instanciaId: string } }
) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const data = await backendFetch(`/instancias/${params.instanciaId}/desconectar`, user.id, { method: 'POST' })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
