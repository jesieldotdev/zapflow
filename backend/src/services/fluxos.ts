import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { WASocket } from '@whiskeysockets/baileys'
import { enviarMensagem } from '../whatsapp/manager'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface FluxoNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, any>
}

interface FluxoEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

function matchTrigger(fluxo: any, mensagem: string): boolean {
  // Prioriza config do nó de início (editado no editor visual)
  const startNode = (fluxo.nodes || []).find((n: any) => n.type === 'inicio')
  const tipo = startNode?.data?.trigger_tipo || fluxo.trigger_tipo || 'palavra_chave'
  const valor = startNode?.data?.trigger_valor || fluxo.trigger_valor || ''

  console.log(`[fluxo] trigger_tipo="${tipo}" trigger_valor="${valor}"`)

  if (tipo === 'qualquer_mensagem') return true
  if (tipo === 'primeiro_contato') return true
  if (tipo === 'palavra_chave') {
    if (!valor.trim()) return true
    const keywords = valor.split(',').map((k: string) => k.trim().toLowerCase())
    return keywords.some((k: string) => mensagem.toLowerCase().includes(k))
  }
  return false
}

export async function processarMensagemFluxo(
  instanciaId: string,
  numero: string,
  mensagem: string,
  sock: WASocket
): Promise<boolean> {
  console.log(`[fluxo] mensagem de ${numero}: "${mensagem}"`)

  // Busca instância para pegar o user_id
  const { data: instancia } = await supabase
    .from('instancias')
    .select('user_id')
    .eq('id', instanciaId)
    .single()

  if (!instancia) {
    console.log(`[fluxo] instância ${instanciaId} não encontrada`)
    return false
  }

  console.log(`[fluxo] user_id=${instancia.user_id} instanciaId=${instanciaId}`)

  // Busca fluxos ativos: vinculados a esta instância OU sem instâncias definidas (null = todas)
  const { data: fluxos, error } = await supabase
    .from('fluxos')
    .select('*')
    .eq('user_id', instancia.user_id)
    .eq('ativo', true)
    .or(`instancia_ids.cs.{${instanciaId}},instancia_ids.is.null`)

  if (error) console.log(`[fluxo] erro ao buscar fluxos:`, error.message)
  console.log(`[fluxo] fluxos ativos encontrados: ${fluxos?.length ?? 0}`)

  if (!fluxos?.length) return false

  // Busca ou cria conversa
  const conversa = await getOuCriarConversa(instanciaId, numero)
  if (!conversa) return false

  // Se conversa está com humano, não processa fluxo
  if (conversa.status === 'humano') return false

  // Encontra fluxo que corresponde ao gatilho
  const fluxo = fluxos.find(f => matchTrigger(f, mensagem))
  console.log(`[fluxo] fluxo ativado: ${fluxo?.nome ?? 'nenhum'} | mensagem: "${mensagem}"`)
  if (!fluxo) return false

  const nodes: FluxoNode[] = fluxo.nodes || []
  const edges: FluxoEdge[] = fluxo.edges || []

  const startNode = nodes.find(n => n.type === 'inicio')
  if (!startNode) return false

  // Salva mensagem do usuário na conversa
  const mensagens = conversa.mensagens || []
  mensagens.push({ role: 'user', content: mensagem, timestamp: new Date().toISOString() })
  await salvarMensagens(conversa.id, mensagens)

  // Executa o fluxo com proteção contra erros de envio
  const vars: Record<string, string> = { mensagem, numero }
  const jid = numero.includes('@') ? numero : `${numero}@s.whatsapp.net`
  let currentId: string = startNode.id
  const visited = new Set<string>()

  while (currentId) {
    if (visited.has(currentId)) break
    visited.add(currentId)

    const node = nodes.find(n => n.id === currentId)
    if (!node) break

    const d = node.data
    let stop = false
    console.log(`[fluxo] executando nó: ${node.type} (${node.id})`)

    switch (node.type) {
      case 'inicio':
        break // apenas ponto de entrada

      case 'texto': {
        const txt = interpolate(d.mensagem || '', vars)
        try {
          await sock.sendMessage(jid, { text: txt })
          mensagens.push({ role: 'assistant', content: txt, timestamp: new Date().toISOString() })
          await salvarMensagens(conversa.id, mensagens)
        } catch (e: any) { console.error(`[fluxo] erro ao enviar texto:`, e.message) }
        break
      }

      case 'imagem': {
        if (d.url) {
          const caption = d.caption ? interpolate(d.caption, vars) : undefined
          try {
            await sock.sendMessage(jid, { image: { url: d.url }, caption })
            const log = `[imagem]${caption ? ' ' + caption : ''}`
            mensagens.push({ role: 'assistant', content: log, timestamp: new Date().toISOString() })
            await salvarMensagens(conversa.id, mensagens)
          } catch (e: any) { console.error(`[fluxo] erro ao enviar imagem:`, e.message) }
        }
        break
      }

      case 'audio': {
        if (d.url) {
          try {
            await sock.sendMessage(jid, { audio: { url: d.url }, mimetype: 'audio/mpeg', ptt: false })
            mensagens.push({ role: 'assistant', content: '[áudio]', timestamp: new Date().toISOString() })
            await salvarMensagens(conversa.id, mensagens)
          } catch (e: any) { console.error(`[fluxo] erro ao enviar áudio:`, e.message) }
        }
        break
      }

      case 'documento': {
        if (d.url) {
          try {
            await sock.sendMessage(jid, { document: { url: d.url }, fileName: d.filename || 'arquivo', mimetype: 'application/octet-stream' })
            mensagens.push({ role: 'assistant', content: `[documento: ${d.filename || 'arquivo'}]`, timestamp: new Date().toISOString() })
            await salvarMensagens(conversa.id, mensagens)
          } catch (e: any) { console.error(`[fluxo] erro ao enviar documento:`, e.message) }
        }
        break
      }

      case 'link': {
        const txt = `${interpolate(d.mensagem || '', vars)}\n${d.url || ''}`.trim()
        try {
          await sock.sendMessage(jid, { text: txt })
          mensagens.push({ role: 'assistant', content: txt, timestamp: new Date().toISOString() })
          await salvarMensagens(conversa.id, mensagens)
        } catch (e: any) { console.error(`[fluxo] erro ao enviar link:`, e.message) }
        break
      }

      case 'delay': {
        const ms = ((d.delay_valor || 3) * (d.delay_unidade === 'minutos' ? 60000 : 1000))
        try {
          await sock.sendPresenceUpdate('composing', jid)
          await sleep(Math.min(ms, 30000))
          await sock.sendPresenceUpdate('paused', jid)
        } catch (e: any) { console.error(`[fluxo] erro no delay:`, e.message) }
        break
      }

      case 'variavel': {
        if (d.variavel_nome) {
          vars[d.variavel_nome] = d.variavel_valor === '{{mensagem}}'
            ? mensagem
            : interpolate(d.variavel_valor || '', vars)
        }
        break
      }

      case 'condicao': {
        const campo = d.condicao_campo === 'variavel'
          ? (vars[d.condicao_variavel || ''] ?? '')
          : mensagem
        const valorCond = (d.condicao_valor || '').toLowerCase()
        const campoLower = campo.toLowerCase()

        let resultado = false
        switch (d.condicao_operador) {
          case 'igual':      resultado = campoLower === valorCond; break
          case 'nao_contem': resultado = !campoLower.includes(valorCond); break
          case 'comeca_com': resultado = campoLower.startsWith(valorCond); break
          default:           resultado = campoLower.includes(valorCond)
        }

        const branch = resultado ? 'sim' : 'nao'
        const condEdge = edges.find(e => e.source === node.id && e.sourceHandle === branch)
        currentId = condEdge?.target || ''
        continue
      }

      case 'ia': {
        const modelo = d.ia_modelo || 'claude-haiku-4-5-20251001'
        const prompt = d.ia_prompt || 'Você é um assistente prestativo. Responda de forma concisa.'
        try {
          await sock.sendPresenceUpdate('composing', `${numero}@s.whatsapp.net`)
          const resp = await anthropic.messages.create({
            model: modelo,
            max_tokens: 500,
            system: prompt,
            messages: [{ role: 'user', content: mensagem }]
          })
          const resposta = resp.content[0].type === 'text' ? resp.content[0].text : ''
          await sock.sendPresenceUpdate('paused', `${numero}@s.whatsapp.net`)
          await sock.sendMessage(`${numero}@s.whatsapp.net`, { text: resposta })
          mensagens.push({ role: 'assistant', content: resposta, timestamp: new Date().toISOString() })
          await salvarMensagens(conversa.id, mensagens)
        } catch (err) {
          console.error('[fluxo/ia] Erro Claude:', err)
          await sock.sendPresenceUpdate('paused', `${numero}@s.whatsapp.net`)
        }
        break
      }

      case 'transferir': {
        await supabase
          .from('chatbot_conversas')
          .update({ status: 'humano', updated_at: new Date().toISOString() })
          .eq('id', conversa.id)
        await sock.sendMessage(`${numero}@s.whatsapp.net`, {
          text: '🙋 Transferindo para um atendente. Aguarde!'
        })
        stop = true
        break
      }

      case 'fim': {
        stop = true
        break
      }
    }

    if (stop) break

    const nextEdge = edges.find(e => e.source === node.id && !e.sourceHandle)
    currentId = nextEdge?.target || ''
  }

  return true
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
    .insert({ instancia_id: instanciaId, numero, mensagens: [], status: 'bot' })
    .select()
    .single()

  return nova
}

async function salvarMensagens(conversaId: string, mensagens: any[]) {
  await supabase
    .from('chatbot_conversas')
    .update({ mensagens, updated_at: new Date().toISOString() })
    .eq('id', conversaId)
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
