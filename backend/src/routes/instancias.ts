import { Router } from 'express'
import {
  conectarInstancia,
  desconectarInstancia,
  getQRCode
} from '../whatsapp/manager'

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
