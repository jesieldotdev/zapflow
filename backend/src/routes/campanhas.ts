import { Router } from 'express'
import { dispararCampanha } from '../services/campanhas'

export const campanhsRouter = Router()

campanhsRouter.post('/:id/disparar', async (req, res) => {
  const { id } = req.params

  try {
    const result = await dispararCampanha(id)
    if ('error' in result) {
      return res.status(400).json(result)
    }
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})
