import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  proto,
  WASocket,
  BaileysEventMap
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'
import path from 'path'
import fs from 'fs'
import { processarMensagemChatbot } from '../services/chatbot'
import { processarMensagemFluxo } from '../services/fluxos'
import { upsertContato } from '../services/contatos'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Map de instâncias ativas: instanciaId → socket
const instanciasAtivas = new Map<string, WASocket>()
// Map de QR Codes gerados: instanciaId → base64
const qrCodes = new Map<string, string>()
// Map de Pairing Codes gerados: instanciaId → código 8 dígitos
const pairingCodes = new Map<string, string>()

function getSessaoPath(instanciaId: string) {
  const dir = path.join(process.cwd(), 'sessoes', instanciaId)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

export async function conectarInstancia(instanciaId: string, userId: string) {
  // Evita reconexão duplicada
  if (instanciasAtivas.has(instanciaId)) {
    return { ok: true, message: 'Já conectado' }
  }

  await atualizarStatus(instanciaId, 'conectando')

  const sessaoPath = getSessaoPath(instanciaId)
  const { state, saveCreds } = await useMultiFileAuthState(sessaoPath)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, console as any)
    },
    printQRInTerminal: false,
    browser: ['Zapvio', 'Chrome', '124.0.0'],
    syncFullHistory: false,
  })

  instanciasAtivas.set(instanciaId, sock)

  // Salva credenciais sempre que atualizarem
  sock.ev.on('creds.update', saveCreds)

  // Evento de QR Code
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      const qrBase64 = await QRCode.toDataURL(qr)
      qrCodes.set(instanciaId, qrBase64)
      console.log(`[${instanciaId}] QR Code gerado`)
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
      const deveReconectar = statusCode !== DisconnectReason.loggedOut

      instanciasAtivas.delete(instanciaId)
      qrCodes.delete(instanciaId)

      if (deveReconectar) {
        console.log(`[${instanciaId}] Reconectando...`)
        await atualizarStatus(instanciaId, 'desconectado')
        setTimeout(() => conectarInstancia(instanciaId, userId), 3000)
      } else {
        console.log(`[${instanciaId}] Deslogado — removendo sessão`)
        await atualizarStatus(instanciaId, 'desconectado')
        fs.rmSync(sessaoPath, { recursive: true, force: true })
      }
    }

    if (connection === 'open') {
      qrCodes.delete(instanciaId)
      const numero = sock.user?.id?.split(':')[0] || ''
      await atualizarStatus(instanciaId, 'conectado', numero)
      console.log(`[${instanciaId}] Conectado: ${numero}`)
    }
  })

  // Recebe mensagens → processa chatbot
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    console.log(`[upsert] type=${type} msgs=${messages.length}`)
    if (type !== 'notify') return

    for (const msg of messages) {
      console.log(`[upsert] fromMe=${msg.key.fromMe} remoteJid=${msg.key.remoteJid} keys=${Object.keys(msg.message || {}).join(',')}`)
      if (msg.key.fromMe) continue
      if (!msg.message) continue

      // Ignora mensagens de grupos
      if (msg.key.remoteJid?.endsWith('@g.us')) continue

      const numero = msg.key.remoteJid?.replace('@s.whatsapp.net', '') || ''
      const texto =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        msg.message.buttonsResponseMessage?.selectedDisplayText ||
        msg.message.listResponseMessage?.title || ''

      console.log(`[upsert] numero=${numero} texto="${texto}"`)
      if (!texto || !numero) continue

      console.log(`[msg] ${instanciaId} ← ${numero}: "${texto}"`)

      // 0. Salva/atualiza contato automaticamente (não bloqueia o fluxo)
      upsertContato(instanciaId, userId, numero, msg.pushName, sock).catch(() => {})

      // 1. Tenta processar por fluxo ativo
      const fluxoProcessou = await processarMensagemFluxo(instanciaId, numero, texto, sock)

      // 2. Se nenhum fluxo respondeu, tenta chatbot IA
      if (!fluxoProcessou) {
        await processarMensagemChatbot(instanciaId, numero, texto, sock)
      }
    }
  })

  return { ok: true }
}

export async function conectarComPairingCode(instanciaId: string, userId: string, telefone: string) {
  if (instanciasAtivas.has(instanciaId)) {
    return { ok: true, message: 'Já conectado' }
  }

  await atualizarStatus(instanciaId, 'conectando')

  const sessaoPath = getSessaoPath(instanciaId)
  const { state, saveCreds } = await useMultiFileAuthState(sessaoPath)
  const { version } = await fetchLatestBaileysVersion()

  const numero = telefone.replace(/\D/g, '')

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, console as any)
    },
    printQRInTerminal: false,
    browser: ['Zapvio', 'Chrome', '124.0.0'],
    syncFullHistory: false,
  })

  instanciasAtivas.set(instanciaId, sock)
  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    // Quando o QR dispara, o socket está pronto para pairing code
    if (qr && !sock.authState.creds.registered) {
      try {
        const code = await sock.requestPairingCode(numero)
        pairingCodes.set(instanciaId, code)
        console.log(`[${instanciaId}] Pairing code gerado: ${code}`)
      } catch (err: any) {
        console.error(`[${instanciaId}] Erro ao solicitar pairing code:`, err.message)
        await atualizarStatus(instanciaId, 'erro')
      }
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
      const deveReconectar = statusCode !== DisconnectReason.loggedOut

      instanciasAtivas.delete(instanciaId)
      pairingCodes.delete(instanciaId)

      if (deveReconectar) {
        console.log(`[${instanciaId}] Reconectando via pairing code...`)
        await atualizarStatus(instanciaId, 'desconectado')
        setTimeout(() => conectarComPairingCode(instanciaId, userId, telefone), 3000)
      } else {
        console.log(`[${instanciaId}] Deslogado — removendo sessão`)
        await atualizarStatus(instanciaId, 'desconectado')
        fs.rmSync(sessaoPath, { recursive: true, force: true })
      }
    }

    if (connection === 'open') {
      const numeroConectado = sock.user?.id?.split(':')[0] || ''
      pairingCodes.delete(instanciaId)
      await atualizarStatus(instanciaId, 'conectado', numeroConectado)
      console.log(`[${instanciaId}] Conectado via pairing code: ${numeroConectado}`)
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const msg of messages) {
      if (msg.key.fromMe) continue
      if (!msg.message) continue
      if (msg.key.remoteJid?.endsWith('@g.us')) continue

      const numeroMsg = msg.key.remoteJid?.replace(/@s\.whatsapp\.net$/, '') || ''
      const texto =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        msg.message.buttonsResponseMessage?.selectedDisplayText ||
        msg.message.listResponseMessage?.title || ''

      if (!texto || !numeroMsg) continue

      upsertContato(instanciaId, userId, numeroMsg, msg.pushName, sock).catch(() => {})
      const fluxoProcessou = await processarMensagemFluxo(instanciaId, numeroMsg, texto, sock)
      if (!fluxoProcessou) {
        await processarMensagemChatbot(instanciaId, numeroMsg, texto, sock)
      }
    }
  })

  return { ok: true }
}

export async function desconectarInstancia(instanciaId: string) {
  const sock = instanciasAtivas.get(instanciaId)
  if (sock) {
    await sock.logout()
    instanciasAtivas.delete(instanciaId)
  }
  qrCodes.delete(instanciaId)
  pairingCodes.delete(instanciaId)
  await atualizarStatus(instanciaId, 'desconectado')
}


export function getQRCode(instanciaId: string) {
  return qrCodes.get(instanciaId) || null
}

export function getPairingCode(instanciaId: string) {
  return pairingCodes.get(instanciaId) || null
}

export function getSocket(instanciaId: string) {
  return instanciasAtivas.get(instanciaId) || null
}

export async function enviarMensagem(
  instanciaId: string,
  numero: string,
  mensagem: string,
  midiaUrl?: string
) {
  const sock = instanciasAtivas.get(instanciaId)
  if (!sock) throw new Error('Instância não conectada')

  const jid = numero.includes('@') ? numero : `${numero}@s.whatsapp.net`

  if (midiaUrl) {
    // Envia imagem/documento se tiver URL
    await sock.sendMessage(jid, {
      image: { url: midiaUrl },
      caption: mensagem
    })
  } else {
    await sock.sendMessage(jid, { text: mensagem })
  }
}

async function atualizarStatus(
  instanciaId: string,
  status: string,
  numero?: string
) {
  const update: any = { status, updated_at: new Date().toISOString() }
  if (numero) update.numero = numero

  await supabase
    .from('instancias')
    .update(update)
    .eq('id', instanciaId)
}

// Ao iniciar o servidor, reconecta instâncias que estavam conectadas
export async function reconectarTodasInstancias() {
  const { data: instancias } = await supabase
    .from('instancias')
    .select('id, user_id')
    .eq('status', 'conectado')

  if (!instancias?.length) return

  console.log(`Reconectando ${instancias.length} instância(s)...`)
  for (const inst of instancias) {
    await conectarInstancia(inst.id, inst.user_id)
  }
}
