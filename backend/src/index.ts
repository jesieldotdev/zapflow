// ZapFlow Backend
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { instanciasRouter } from './routes/instancias'
import { campanhsRouter } from './routes/campanhas'
import { chatbotRouter } from './routes/chatbot'
import { conversasRouter } from './routes/conversas'
import { authMiddleware } from './middleware/auth'
import { reconectarTodasInstancias } from './whatsapp/manager'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))

// Health check (sem auth)
app.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() })
})

// Todas as rotas protegidas pelo secret compartilhado
app.use('/api', authMiddleware)
app.use('/api/instancias', instanciasRouter)
app.use('/api/campanhas', campanhsRouter)
app.use('/api/chatbot', chatbotRouter)
app.use('/api/conversas', conversasRouter)

app.listen(PORT, () => {
  console.log(`ZapFlow Backend rodando na porta ${PORT}`)
  reconectarTodasInstancias()
})
