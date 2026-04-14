import { Router } from 'express'

export const iaRouter = Router()

const SYSTEM_PROMPT = `You are an expert at creating WhatsApp automation flows. Respond with ONLY valid JSON — no markdown, no explanation. The JSON must have exactly two fields: "nodes" and "edges".

NODE TYPES AND DATA:
- "inicio": data: { trigger_tipo: "palavra_chave"|"qualquer_mensagem"|"primeiro_contato", trigger_valor?: "kw1,kw2" }
- "texto": data: { mensagem: "text" }
- "imagem": data: { url: "https://...", caption?: "text" }
- "audio": data: { url: "https://..." }
- "documento": data: { url: "https://...", filename: "file.pdf" }
- "link": data: { mensagem: "click here", url: "https://..." }
- "delay": data: { delay_valor: 3, delay_unidade: "segundos"|"minutos" }
- "variavel": data: { variavel_nome: "nome", variavel_valor: "{{mensagem}}" }
- "condicao": data: { condicao_campo: "mensagem"|"variavel", condicao_variavel?: "varname", condicao_operador: "contem"|"igual"|"nao_contem"|"comeca_com", condicao_valor: "text" }
- "ia": data: { ia_prompt: "You are a helpful assistant...", ia_modelo: "claude-haiku-4-5-20251001" }
- "transferir": data: {}
- "fim": data: {}

RULES:
1. Always start with "inicio" and end with "fim" or "transferir"
2. Node IDs: "n1", "n2", etc.
3. Edge IDs: "e-SOURCE-TARGET" (append "-sim" or "-nao" for condition branches)
4. Layout: x=200, y starts at 80, increases by 160 per level; branch nodes offset x by ±250
5. "condicao" needs TWO edges: sourceHandle:"sim" (true) and sourceHandle:"nao" (false)
6. Normal edges have NO sourceHandle field
7. Variables available: {{mensagem}}, {{numero}}
8. Write messages in Brazilian Portuguese unless instructed otherwise
9. RESPOND WITH ONLY THE JSON OBJECT — NO MARKDOWN`

iaRouter.post('/gerar-fluxo', async (req, res) => {
  const { descricao, fluxoAtual } = req.body as {
    descricao: string
    fluxoAtual?: { nodes: any[]; edges: any[] }
  }

  if (!descricao?.trim()) {
    return res.status(400).json({ error: 'Descrição obrigatória' })
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY não configurada no backend' })
  }

  const userMessage = fluxoAtual?.nodes?.length
    ? `Modifique o fluxo abaixo conforme a instrução.\n\nFluxo atual:\n${JSON.stringify(fluxoAtual)}\n\nInstrução: ${descricao}`
    : `Crie um fluxo de automação de WhatsApp para: ${descricao}`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
        'X-Title': 'Zapvio Flow Builder',
      },
      body: JSON.stringify({
        // Alternativas gratuitas: deepseek/deepseek-chat-v3-0324:free, qwen/qwen-2.5-72b-instruct:free
        model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.2,
        max_tokens: 4096,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      console.error('[ia] OpenRouter error:', err)
      const msg = (err as any)?.error?.message || `HTTP ${response.status}`
      return res.status(502).json({ error: `OpenRouter: ${msg}` })
    }

    const data = await response.json() as any
    const content: string = data.choices?.[0]?.message?.content || ''

    // Extrai o JSON mesmo que o modelo envolva em markdown
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[ia] Sem JSON na resposta:', content.slice(0, 300))
      return res.status(500).json({ error: 'Modelo não retornou JSON válido. Tente novamente.' })
    }

    let fluxo: any
    try {
      fluxo = JSON.parse(jsonMatch[0])
    } catch {
      console.error('[ia] JSON inválido:', jsonMatch[0].slice(0, 300))
      return res.status(500).json({ error: 'Resposta do modelo não é JSON válido. Tente novamente.' })
    }

    if (!Array.isArray(fluxo.nodes) || !Array.isArray(fluxo.edges)) {
      return res.status(500).json({ error: 'Estrutura de fluxo inválida retornada pelo modelo.' })
    }

    return res.json({ nodes: fluxo.nodes, edges: fluxo.edges })
  } catch (err: any) {
    console.error('[ia] Erro:', err)
    return res.status(500).json({ error: err.message || 'Erro interno' })
  }
})
