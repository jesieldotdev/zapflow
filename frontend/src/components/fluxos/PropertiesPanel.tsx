'use client'

import { X, Trash2 } from 'lucide-react'
import type { FluxoNode, FluxoNodeType, FluxoNodeData } from '@/types'
import { NODE_CONFIG } from './FlowNodes'

const MODELOS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku (rápido)' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet (inteligente)' },
]

interface Props {
  node: FluxoNode | null
  onClose: () => void
  onChange: (id: string, data: Partial<FluxoNodeData>) => void
  onDelete: (id: string) => void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1.5 font-medium">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 transition-colors'
const textareaCls = `${inputCls} resize-none`
const selectCls = `${inputCls}`

function Fields({ tipo, data, onChange }: { tipo: FluxoNodeType; data: FluxoNodeData; onChange: (d: Partial<FluxoNodeData>) => void }) {
  switch (tipo) {
    case 'inicio':
      return (
        <>
          <Field label="Gatilho">
            <select value={data.trigger_tipo || 'palavra_chave'} onChange={e => onChange({ trigger_tipo: e.target.value as any })} className={selectCls}>
              <option value="palavra_chave">Palavra-chave</option>
              <option value="qualquer_mensagem">Qualquer mensagem</option>
              <option value="primeiro_contato">Primeiro contato</option>
            </select>
          </Field>
          {(!data.trigger_tipo || data.trigger_tipo === 'palavra_chave') && (
            <Field label="Palavra-chave">
              <input value={data.trigger_valor || ''} onChange={e => onChange({ trigger_valor: e.target.value })} placeholder="ex: oi, olá, preço" className={inputCls} />
              <p className="text-zinc-500 text-xs mt-1">Separe múltiplas com vírgula</p>
            </Field>
          )}
        </>
      )

    case 'texto':
      return (
        <Field label="Mensagem">
          <textarea value={data.mensagem || ''} onChange={e => onChange({ mensagem: e.target.value })} rows={5} placeholder={'Olá {{nome}}, tudo bem?\n\nUse {{variavel}} para personalizar.'} className={textareaCls} />
          <p className="text-zinc-500 text-xs mt-1">Use {'{{variavel}}'} para inserir dados do contato</p>
        </Field>
      )

    case 'imagem':
      return (
        <>
          <Field label="URL da imagem">
            <input value={data.url || ''} onChange={e => onChange({ url: e.target.value })} placeholder="https://..." className={inputCls} />
          </Field>
          <Field label="Legenda (opcional)">
            <textarea value={data.caption || ''} onChange={e => onChange({ caption: e.target.value })} rows={3} placeholder="Texto que acompanha a imagem" className={textareaCls} />
          </Field>
        </>
      )

    case 'audio':
      return (
        <Field label="URL do áudio (mp3/ogg)">
          <input value={data.url || ''} onChange={e => onChange({ url: e.target.value })} placeholder="https://..." className={inputCls} />
        </Field>
      )

    case 'documento':
      return (
        <>
          <Field label="URL do documento">
            <input value={data.url || ''} onChange={e => onChange({ url: e.target.value })} placeholder="https://..." className={inputCls} />
          </Field>
          <Field label="Nome do arquivo">
            <input value={data.filename || ''} onChange={e => onChange({ filename: e.target.value })} placeholder="catalogo.pdf" className={inputCls} />
          </Field>
        </>
      )

    case 'link':
      return (
        <>
          <Field label="URL">
            <input value={data.url || ''} onChange={e => onChange({ url: e.target.value })} placeholder="https://seusite.com" className={inputCls} />
          </Field>
          <Field label="Mensagem que acompanha">
            <textarea value={data.mensagem || ''} onChange={e => onChange({ mensagem: e.target.value })} rows={3} placeholder="Acesse nosso catálogo completo:" className={textareaCls} />
          </Field>
        </>
      )

    case 'condicao':
      return (
        <>
          <Field label="Campo a verificar">
            <select value={data.condicao_campo || 'mensagem'} onChange={e => onChange({ condicao_campo: e.target.value as any })} className={selectCls}>
              <option value="mensagem">Texto da mensagem</option>
              <option value="variavel">Variável</option>
            </select>
          </Field>
          {data.condicao_campo === 'variavel' && (
            <Field label="Nome da variável">
              <input value={data.condicao_variavel || ''} onChange={e => onChange({ condicao_variavel: e.target.value })} placeholder="ex: cidade" className={inputCls} />
            </Field>
          )}
          <Field label="Operador">
            <select value={data.condicao_operador || 'contem'} onChange={e => onChange({ condicao_operador: e.target.value as any })} className={selectCls}>
              <option value="contem">Contém</option>
              <option value="igual">É igual a</option>
              <option value="nao_contem">Não contém</option>
              <option value="comeca_com">Começa com</option>
            </select>
          </Field>
          <Field label="Valor">
            <input value={data.condicao_valor || ''} onChange={e => onChange({ condicao_valor: e.target.value })} placeholder="ex: comprar" className={inputCls} />
          </Field>
          <div className="bg-zinc-800 rounded-lg p-3 text-xs text-zinc-400">
            <div className="flex items-center gap-2 mb-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> <span className="text-emerald-400">Saída Sim</span> — condição verdadeira</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> <span className="text-red-400">Saída Não</span> — condição falsa</div>
          </div>
        </>
      )

    case 'delay':
      return (
        <div className="flex gap-3">
          <Field label="Tempo">
            <input type="number" min={1} max={3600} value={data.delay_valor || 5} onChange={e => onChange({ delay_valor: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Unidade">
            <select value={data.delay_unidade || 'segundos'} onChange={e => onChange({ delay_unidade: e.target.value as any })} className={selectCls}>
              <option value="segundos">Segundos</option>
              <option value="minutos">Minutos</option>
            </select>
          </Field>
        </div>
      )

    case 'ia':
      return (
        <>
          <Field label="Modelo">
            <select value={data.ia_modelo || 'claude-haiku-4-5-20251001'} onChange={e => onChange({ ia_modelo: e.target.value })} className={selectCls}>
              {MODELOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </Field>
          <Field label="Prompt específico (opcional)">
            <textarea value={data.ia_prompt || ''} onChange={e => onChange({ ia_prompt: e.target.value })} rows={5} placeholder="Deixe em branco para usar o prompt do chatbot configurado. Ou escreva um prompt específico para esta etapa do fluxo." className={textareaCls} />
          </Field>
        </>
      )

    case 'variavel':
      return (
        <>
          <Field label="Nome da variável">
            <input value={data.variavel_nome || ''} onChange={e => onChange({ variavel_nome: e.target.value })} placeholder="ex: cidade" className={inputCls} />
          </Field>
          <Field label="Valor">
            <input value={data.variavel_valor || ''} onChange={e => onChange({ variavel_valor: e.target.value })} placeholder="ex: São Paulo ou {{mensagem}}" className={inputCls} />
            <p className="text-zinc-500 text-xs mt-1">Use {'{{mensagem}}'} para capturar o texto enviado pelo contato</p>
          </Field>
        </>
      )

    case 'transferir':
      return (
        <div className="bg-zinc-800 rounded-lg p-3 text-sm text-zinc-400">
          Transfere a conversa para um atendente humano. O bot para de responder e o atendimento aparece no inbox como <span className="text-green-400">Humano</span>.
        </div>
      )

    case 'fim':
      return (
        <div className="bg-zinc-800 rounded-lg p-3 text-sm text-zinc-400">
          Encerra o fluxo para este contato. Próximas mensagens iniciarão o fluxo novamente se atingirem o gatilho.
        </div>
      )

    default:
      return null
  }
}

export default function PropertiesPanel({ node, onClose, onChange, onDelete }: Props) {
  if (!node) return null

  const tipo = node.type as FluxoNodeType
  const cfg = NODE_CONFIG[tipo]
  const Icon = cfg.icon

  return (
    <div className="w-72 flex-shrink-0 border-l border-zinc-800 bg-zinc-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b border-zinc-800 ${cfg.cor}`}>
        <div className="flex items-center gap-2">
          <Icon size={15} />
          <span className="font-semibold text-sm">{cfg.label}</span>
        </div>
        <button onClick={onClose} className="hover:opacity-70 transition-opacity">
          <X size={16} />
        </button>
      </div>

      {/* Campos */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Fields
          tipo={tipo}
          data={node.data}
          onChange={partial => onChange(node.id, partial)}
        />
      </div>

      {/* Rodapé com botão de remover */}
      <div className="px-4 py-3 border-t border-zinc-800 flex-shrink-0">
        <button
          onClick={() => onDelete(node.id)}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg py-2 transition-colors"
        >
          <Trash2 size={14} />
          Remover nó
        </button>
      </div>
    </div>
  )
}
