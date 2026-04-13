import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(
  req: NextRequest,
  { params }: { params: { conversaId: string } }
) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { status } = await req.json()

  const { error } = await supabase
    .from('chatbot_conversas')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', params.conversaId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
