// src/app/api/campanhas/[campanhaId]/disparar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { backendFetch } from '@/lib/backend'

export async function POST(
  _req: NextRequest,
  { params }: { params: { campanhaId: string } }
) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Verifica que a campanha pertence ao usuário
  const { data: campanha } = await supabase
    .from('campanhas')
    .select('id')
    .eq('id', params.campanhaId)
    .eq('user_id', user.id)
    .single()

  if (!campanha) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })

  try {
    const data = await backendFetch(
      `/campanhas/${params.campanhaId}/disparar`,
      user.id,
      { method: 'POST' }
    )
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
