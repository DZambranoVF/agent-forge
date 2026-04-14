import { useCallback, useRef, useState } from 'react'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface UseBrainOptions {
  systemPrompt: string
  apiEndpoint?: string   // default: /api/brain
  onChunk?: (chunk: string) => void
  onDone?: (fullText: string) => void
}

export interface UseBrainReturn {
  messages: Message[]
  isThinking: boolean
  ask: (userMessage: string) => Promise<string>
  reset: () => void
  lastResponse: string
}

export function useBrain({
  systemPrompt,
  apiEndpoint = '/api/brain',
  onChunk,
  onDone,
}: UseBrainOptions): UseBrainReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [lastResponse, setLastResponse] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const ask = useCallback(
    async (userMessage: string): Promise<string> => {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()

      const newMessages: Message[] = [
        ...messages,
        { role: 'user', content: userMessage },
      ]
      setMessages(newMessages)
      setIsThinking(true)
      setLastResponse('')

      let fullText = ''

      try {
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: newMessages, systemPrompt }),
          signal: abortRef.current.signal,
        })

        if (!res.ok) throw new Error(`Brain API error: ${res.status}`)
        if (!res.body) throw new Error('No response body')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          // Parse SSE lines: "data: <text>\n\n"
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const text = line.slice(6)
              if (text === '[DONE]') continue
              fullText += text
              onChunk?.(text)
              setLastResponse(fullText)
            }
          }
        }

        const assistantMessage: Message = { role: 'assistant', content: fullText }
        setMessages(prev => [...prev, assistantMessage])
        onDone?.(fullText)
        return fullText
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return ''
        throw err
      } finally {
        setIsThinking(false)
      }
    },
    [messages, systemPrompt, apiEndpoint, onChunk, onDone]
  )

  const reset = useCallback(() => {
    setMessages([])
    setLastResponse('')
    setIsThinking(false)
  }, [])

  return { messages, isThinking, ask, reset, lastResponse }
}
