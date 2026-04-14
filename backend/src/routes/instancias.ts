import { Router } from 'express'
import {
  conectarInstancia,
  conectarComPairingCode,
  desconectarInstancia,
  getQRCode,
  getPairingCode,
  getSocket,
} from '../whatsapp/manager'
import { atualizarFotoContato } from '../services/contatos'

export const instanciasRouter = Router()

// Iniciar conexão / gerar QR Code
instanciasRouter.post('/:id/conectar', async (req, res) => {
  const { id } = req.params
  const userId = (req as any).userId

  try {
    const result = await conectarInstancia(id, userId)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Buscar QR Code gerado
instanciasRouter.get('/:id/qrcode', (req, res) => {
  const { id } = req.params
  const qr = getQRCode(id)

  if (!qr) {
    return res.status(404).json({ error: 'QR Code não disponível. Inicie a conexão primeiro.' })
  }

  res.json({ qrcode: qr })
})

// Iniciar conexão via pairing code (telefone)
instanciasRouter.post('/:id/pairing-code', async (req, res) => {
  const { id } = req.params
  const { telefone } = req.body
  const userId = (req as any).userId

  if (!telefone) return res.status(400).json({ error: 'telefone é obrigatório' })

  try {
    const result = await conectarComPairingCode(id, userId, telefone)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Buscar pairing code gerado
instanciasRouter.get('/:id/pairing-code', (req, res) => {
  const { id } = req.params
  const code = getPairingCode(id)

  if (!code) {
    return res.status(404).json({ error: 'Código não disponível ainda.' })
  }

  res.json({ code })
})

// Desconectar instância
instanciasRouter.post('/:id/desconectar', async (req, res) => {
  const { id } = req.params

  try {
    await desconectarInstancia(id)
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Atualizar foto de perfil de um contato via WhatsApp
instanciasRouter.post('/:id/foto-contato', async (req, res) => {
  const { id } = req.params
  const { numero } = req.body
  const userId = (req as any).userId

  if (!numero) return res.status(400).json({ error: 'numero é obrigatório' })

  const sock = getSocket(id)
  if (!sock) return res.status(404).json({ error: 'Instância não conectada' })

  const foto_url = await atualizarFotoContato(userId, numero, sock)
  res.json({ foto_url })
})
