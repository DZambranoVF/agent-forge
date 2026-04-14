import { useCallback, useRef, useState } from 'react'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface UseAgentOptions {
  /** Endpoint del API route que maneja el loop completo de tool use. Default: /api/agent */
  apiEndpoint?: string
  /** Configuración del negocio serializada como JSON — se pasa al servidor */
  businessConfig?: Record<string, unknown>
  /** System prompt base. Si usas businessConfig, buildSystemPrompt() lo genera automáticamente */
  systemPrompt?: string
  /** Callback: recibe cada chunk de texto mientras Claude responde */
  onChunk?: (chunk: string) => void
  /** Callback: texto final completo */
  onDone?: (fullText: string) => void
  /** Callback: Claude está ejecutando herramientas (tool loop en curso) */
  onToolCall?: (toolName: string) => void
}

export interface UseAgentReturn {
  messages: Message[]
  isThinking: boolean
  /** Nombre de la herramienta que Claude está usando ahora mismo (null si no hay) */
  activeToolName: string | null
  ask: (userMessage: string) => Promise<string>
  reset: () => void
  lastResponse: string
}

/**
 * useAgent — superset de useBrain con soporte completo de tool use.
 *
 * El loop de herramientas corre server-side en /api/agent.
 * El cliente solo recibe el texto final streameado como SSE.
 *
 * @example
 * const { ask, isThinking, messages } = useAgent({
 *   businessConfig: myBusinessJson,
 *   systemPrompt: buildSystemPrompt(myBusinessJson),
 * })
 * await ask('¿Tienen laptops por menos de $500?')
 */
export function useAgent({
  apiEndpoint = '/api/agent',
  businessConfig,
  systemPrompt = 'Eres un asistente útil. Responde en español.',
  onChunk,
  onDone,
  onToolCall,
}: UseAgentOptions = {}): UseAgentReturn {
  const [messages, setMessages]           = useState<Message[]>([])
  const [isThinking, setIsThinking]       = useState(false)
  const [lastResponse, setLastResponse]   = useState('')
  const [activeToolName, setActiveToolName] = useState<string | null>(null)
  const abortRef   = useRef<AbortController | null>(null)
  const historyRef = useRef<Message[]>([])

  const ask = useCallback(async (userMessage: string): Promise<string> => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    const newHistory: Message[] = [
      ...historyRef.current,
      { role: 'user', content: userMessage },
    ]
    historyRef.current = newHistory
    setMessages(newHistory)
    setIsThinking(true)
    setLastResponse('')
    setActiveToolName(null)

    let fullText = ''

    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory,
          systemPrompt,
          businessConfig: businessConfig ?? null,
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error(`Agent API error: ${res.status}`)
      if (!res.body) throw new Error('No response body')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue

          // Evento especial: tool call en progreso
          if (data.startsWith('[TOOL:')) {
            const toolName = data.slice(6, -1)  // [TOOL:buscar_productos]
            setActiveToolName(toolName)
            onToolCall?.(toolName)
            continue
          }

          fullText += data
          onChunk?.(data)
          setLastResponse(fullText)
        }
      }

      const assistantMsg: Message = { role: 'assistant', content: fullText }
      historyRef.current = [...newHistory, assistantMsg]
      setMessages(historyRef.current)
      onDone?.(fullText)
      return fullText

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return ''
      throw err
    } finally {
      setIsThinking(false)
      setActiveToolName(null)
    }
  }, [apiEndpoint, systemPrompt, businessConfig, onChunk, onDone, onToolCall])

  const reset = useCallback(() => {
    historyRef.current = []
    setMessages([])
    setLastResponse('')
    setIsThinking(false)
    setActiveToolName(null)
  }, [])

  return { messages, isThinking, activeToolName, ask, reset, lastResponse }
}
