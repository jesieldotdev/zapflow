import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { enviarMensagem } from '../whatsapp/manager'

export const conversasRouter = Router()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Responder a uma conversa (humano enviando do inbox)
conversasRouter.post('/:id/responder', async (req, res) => {
  const { id } = req.params
  const { mensagem, midia_url } = req.body

  if (!mensagem && !midia_url) {
    return res.status(400).json({ error: 'mensagem ou midia_url é obrigatório' })
  }

  const { data: conversa, error: errBusca } = await supabase
    .from('chatbot_conversas')
    .select('*')
    .eq('id', id)
    .single()

  if (errBusca || !conversa) {
    return res.status(404).json({ error: 'Conversa não encontrada' })
  }

  try {
    // Envia via Baileys
    await enviarMensagem(conversa.instancia_id, conversa.numero, mensagem || '', midia_url)

    // Registra no histórico
    const mensagens = conversa.mensagens || []
    mensagens.push({
      role: 'assistant',
      content: mensagem || `[mídia: ${midia_url}]`,
      from_human: true,
      timestamp: new Date().toISOString()
    })

    await supabase
      .from('chatbot_conversas')
      .update({ mensagens, updated_at: new Date().toISOString() })
      .eq('id', id)

    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Atualizar status da conversa (bot / humano / encerrado)
conversasRouter.post('/:id/status', async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  if (!['bot', 'humano', 'encerrado'].includes(status)) {
    return res.status(400).json({ error: 'status inválido' })
  }

  const { error } = await supabase
    .from('chatbot_conversas')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})
