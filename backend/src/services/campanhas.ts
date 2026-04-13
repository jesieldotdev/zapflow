import { createClient } from '@supabase/supabase-js'
import { enviarMensagem, getSocket } from '../whatsapp/manager'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Fila simples em memória por campanha
const campanhasEmAndamento = new Set<string>()

export async function dispararCampanha(campanhaId: string) {
  if (campanhasEmAndamento.has(campanhaId)) {
    return { error: 'Campanha já em andamento' }
  }

  const { data: campanha } = await supabase
    .from('campanhas')
    .select('*, instancias(id, status)')
    .eq('id', campanhaId)
    .single()

  if (!campanha) return { error: 'Campanha não encontrada' }
  if ((campanha.instancias as any).status !== 'conectado') {
    return { error: 'Instância não conectada' }
  }

  // Busca contatos pendentes
  const { data: contatos } = await supabase
    .from('campanha_contatos')
    .select('*')
    .eq('campanha_id', campanhaId)
    .eq('status', 'pendente')

  if (!contatos?.length) return { error: 'Nenhum contato pendente' }

  // Marca como em andamento
  campanhasEmAndamento.add(campanhaId)
  await atualizarCampanha(campanhaId, { status: 'em_andamento' })

  // Processa em background (não bloqueia a rota)
  processar(campanha, contatos).finally(() => {
    campanhasEmAndamento.delete(campanhaId)
  })

  return { ok: true, total: contatos.length }
}

async function processar(campanha: any, contatos: any[]) {
  let enviados = 0
  let erros = 0

  for (const contato of contatos) {
    // Verifica se campanha foi pausada/cancelada
    const { data: atual } = await supabase
      .from('campanhas')
      .select('status')
      .eq('id', campanha.id)
      .single()

    if (atual?.status === 'pausada' || atual?.status === 'rascunho') {
      console.log(`[campanha] ${campanha.id} pausada`)
      break
    }

    try {
      // Personaliza mensagem com variáveis do contato
      const mensagem = personalizarMensagem(campanha.mensagem, contato.variaveis || {})

      await enviarMensagem(
        campanha.instancia_id,
        contato.numero,
        mensagem,
        campanha.midia_url
      )

      // Marca como enviado
      await supabase
        .from('campanha_contatos')
        .update({ status: 'enviado', enviado_em: new Date().toISOString() })
        .eq('id', contato.id)

      // Log
      await supabase.from('mensagens_log').insert({
        instancia_id: campanha.instancia_id,
        user_id: campanha.user_id,
        campanha_id: campanha.id,
        numero: contato.numero,
        conteudo: mensagem,
        status: 'enviado'
      })

      enviados++
      await atualizarCampanha(campanha.id, { enviados })

    } catch (err: any) {
      erros++
      await supabase
        .from('campanha_contatos')
        .update({ status: 'erro', erro_msg: err.message })
        .eq('id', contato.id)
      await atualizarCampanha(campanha.id, { erros })
    }

    // Intervalo aleatório anti-ban (muito importante!)
    const intervaloMs = randomBetween(
      (campanha.intervalo_min_seg || 5) * 1000,
      (campanha.intervalo_max_seg || 15) * 1000
    )
    await sleep(intervaloMs)
  }

  const statusFinal = erros === contatos.length ? 'erro' : 'concluida'
  await atualizarCampanha(campanha.id, { status: statusFinal, enviados, erros })
  console.log(`[campanha] ${campanha.id} finalizada: ${enviados} enviados, ${erros} erros`)
}

function personalizarMensagem(template: string, variaveis: Record<string, string>) {
  let msg = template
  for (const [chave, valor] of Object.entries(variaveis)) {
    msg = msg.replace(new RegExp(`{{${chave}}}`, 'g'), valor)
  }
  return msg
}

async function atualizarCampanha(id: string, dados: any) {
  await supabase
    .from('campanhas')
    .update({ ...dados, updated_at: new Date().toISOString() })
    .eq('id', id)
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
