import { Router } from 'express'

export const chatbotRouter = Router()

// As conversas são gerenciadas automaticamente via eventos Baileys
// Esta rota permite transferir uma conversa para humano manualmente
chatbotRouter.post('/conversas/:id/transferir', async (req, res) => {
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase
    .from('chatbot_conversas')
    .update({ status: 'humano', updated_at: new Date().toISOString() })
    .eq('id', req.params.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})
