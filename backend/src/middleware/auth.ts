import { Request, Response, NextFunction } from 'express'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const secret = req.headers['x-backend-secret']
  
  if (!secret || secret !== process.env.BACKEND_SECRET) {
    return res.status(401).json({ error: 'Não autorizado' })
  }

  // Extrai o user_id passado pelo frontend (já validado pelo Supabase lá)
  const userId = req.headers['x-user-id'] as string
  if (!userId) {
    return res.status(400).json({ error: 'user_id obrigatório' })
  }

  (req as any).userId = userId
  next()
}
