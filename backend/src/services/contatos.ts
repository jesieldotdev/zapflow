import { createClient } from '@supabase/supabase-js'
import { WASocket } from '@whiskeysockets/baileys'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Cria ou atualiza um contato quando uma mensagem chega.
 * - Novo contato: salva número, nome do WhatsApp e foto de perfil
 * - Contato existente: atualiza foto_url somente se ainda estiver vazia
 *   (preserva renomeações feitas pelo usuário)
 */
export async function upsertContato(
  instanciaId: string,
  userId: string,
  numero: string,
  pushName: string | null | undefined,
  sock: WASocket
) {
  const { data: existing } = await supabase
    .from('contatos')
    .select('id, foto_url')
    .eq('user_id', userId)
    .eq('numero', numero)
    .maybeSingle()

  // Só busca a foto se o contato ainda não tem uma
  let foto_url: string | null = existing?.foto_url ?? null
  if (!foto_url) {
    try {
      const jid = `${numero}@s.whatsapp.net`
      foto_url = await sock.profilePictureUrl(jid, 'image') ?? null
    } catch {
      // Contato com privacidade ativada — ignora
    }
  }

  if (existing) {
    if (foto_url && !existing.foto_url) {
      await supabase
        .from('contatos')
        .update({ foto_url, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    }
  } else {
    await supabase.from('contatos').insert({
      user_id: userId,
      instancia_id: instanciaId,
      numero,
      nome: pushName || null,
      foto_url,
    })
    console.log(`[contatos] novo lead salvo: ${numero} (${pushName ?? 'sem nome'})`)
  }
}

/**
 * Atualiza a foto de perfil do WhatsApp de um contato existente.
 * Usado pelo endpoint de refresh manual.
 */
export async function atualizarFotoContato(
  userId: string,
  numero: string,
  sock: WASocket
): Promise<string | null> {
  try {
    const jid = `${numero}@s.whatsapp.net`
    const foto_url = await sock.profilePictureUrl(jid, 'image') ?? null
    if (foto_url) {
      await supabase
        .from('contatos')
        .update({ foto_url, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('numero', numero)
    }
    return foto_url
  } catch {
    return null
  }
}
