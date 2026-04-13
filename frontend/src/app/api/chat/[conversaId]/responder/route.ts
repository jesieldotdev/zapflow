import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { backendFetch } from '@/lib/backend'

export async function POST(
  req: NextRequest,
  { params }: { params: { conversaId: string } }
) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()

  try {
    const data = await backendFetch(
      `/conversas/${params.conversaId}/responder`,
      user.id,
      { method: 'POST', body: JSON.stringify(body) }
    )
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
