import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { WASocket } from '@whiskeysockets/baileys'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function processarMensagemChatbot(
  instanciaId: string,
  numero: string,
  texto: string,
  sock: WASocket
) {
  // Busca configuração do chatbot
  const { data: chatbot } = await supabase
    .from('chatbots')
    .select('*')
    .eq('instancia_id', instanciaId)
    .eq('ativo', true)
    .single()

  // Sempre salva a mensagem recebida na conversa (para o inbox)
  const conversaInicial = await getOuCriarConversa(instanciaId, numero)
  if (conversaInicial) {
    const msgs = conversaInicial.mensagens || []
    msgs.push({ role: 'user', content: texto, timestamp: new Date().toISOString() })
    await supabase
      .from('chatbot_conversas')
      .update({ mensagens: msgs, updated_at: new Date().toISOString() })
      .eq('id', conversaInicial.id)
  }

  if (!chatbot) return

  // Verifica horário de funcionamento
  const agora = new Date()
  const hora = agora.getHours()
  const diaSemana = agora.getDay()
  const horaInicio = parseInt(chatbot.horario_inicio.split(':')[0])
  const horaFim = parseInt(chatbot.horario_fim.split(':')[0])

  if (!chatbot.dias_semana.includes(diaSemana)) return
  if (hora < horaInicio || hora >= horaFim) return

  // Verifica palavras-chave para transferir para humano
  const textoLower = texto.toLowerCase()
  const querHumano = chatbot.palavras_saida?.some(
    (palavra: string) => textoLower.includes(palavra.toLowerCase())
  )

  if (querHumano) {
    await sock.sendMessage(`${numero}@s.whatsapp.net`, {
      text: '🙋 Transferindo você para um atendente humano. Aguarde!'
    })
    await atualizarStatusConversa(instanciaId, numero, 'humano')
    return
  }

  // Busca conversa já criada pelo bloco acima (não recria)
  let conversa = await getOuCriarConversa(instanciaId, numero)

  // Se a conversa está com humano, não responde
  if (conversa.status === 'humano') return

  // Mensagem do usuário já foi salva acima — pega o histórico atualizado
  const mensagens = conversa.mensagens || []

  // Manda indicador de digitação
  const jid = `${numero}@s.whatsapp.net`
  await sock.sendPresenceUpdate('composing', jid)

  try {
    // Chama Claude
    const response = await anthropic.messages.create({
      model: chatbot.modelo || 'claude-haiku-4-5-20251001',
      max_tokens: chatbot.max_tokens || 500,
      system: chatbot.prompt_sistema,
      messages: mensagens
        .filter((m: any) => m.role === 'user' || m.role === 'assistant')
        .slice(-10) // últimas 10 mensagens para não estourar contexto
        .map((m: any) => ({ role: m.role, content: m.content }))
    })

    const resposta = response.content[0].type === 'text'
      ? response.content[0].text
      : ''

    // Adiciona resposta ao histórico
    mensagens.push({
      role: 'assistant',
      content: resposta,
      timestamp: new Date().toISOString()
    })

    // Salva conversa atualizada
    await supabase
      .from('chatbot_conversas')
      .update({
        mensagens,
        tokens_usados: (conversa.tokens_usados || 0) + (response.usage?.output_tokens || 0),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversa.id)

    // Para digitação e envia resposta
    await sock.sendPresenceUpdate('paused', jid)
    await sock.sendMessage(jid, { text: resposta })

  } catch (err) {
    console.error(`[chatbot] Erro ao chamar Claude:`, err)
    await sock.sendPresenceUpdate('paused', jid)
  }
}

async function getOuCriarConversa(instanciaId: string, numero: string) {
  const { data: existente } = await supabase
    .from('chatbot_conversas')
    .select('*')
    .eq('instancia_id', instanciaId)
    .eq('numero', numero)
    .neq('status', 'encerrado')
    .single()

  if (existente) return existente

  const { data: nova } = await supabase
    .from('chatbot_conversas')
    .insert({
      instancia_id: instanciaId,
      numero,
      mensagens: [],
      status: 'bot'
    })
    .select()
    .single()

  return nova!
}

async function atualizarStatusConversa(
  instanciaId: string,
  numero: string,
  status: string
) {
  await supabase
    .from('chatbot_conversas')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('instancia_id', instanciaId)
    .eq('numero', numero)
}
