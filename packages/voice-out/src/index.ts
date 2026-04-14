import { useCallback, useRef, useState } from 'react'

export interface UseVoiceOutOptions {
  apiEndpoint?: string         // default: /api/voice
  onPcmChunk?: (chunk: Uint8Array) => void   // para Simli: recibe PCM16 16kHz
  onAudioReady?: (audioUrl: string) => void  // para reproducción directa
  onStart?: () => void
  onEnd?: () => void
}

export interface UseVoiceOutReturn {
  speak: (text: string) => Promise<void>
  stop: () => void
  isSpeaking: boolean
}

export function useVoiceOut({
  apiEndpoint = '/api/voice',
  onPcmChunk,
  onAudioReady,
  onStart,
  onEnd,
}: UseVoiceOutOptions): UseVoiceOutReturn {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const stop = useCallback(() => {
    abortRef.current?.abort()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsSpeaking(false)
  }, [])

  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) return
      stop()

      abortRef.current = new AbortController()
      setIsSpeaking(true)
      onStart?.()

      try {
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
          signal: abortRef.current.signal,
        })

        if (!res.ok) throw new Error(`Voice API error: ${res.status}`)
        if (!res.body) throw new Error('No response body')

        // Modo Simli: stream PCM16 chunk a chunk
        if (onPcmChunk) {
          const reader = res.body.getReader()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            if (value) onPcmChunk(value)
          }
          onEnd?.()
          setIsSpeaking(false)
          return
        }

        // Modo reproducción directa (sin Simli)
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        onAudioReady?.(url)

        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => {
          URL.revokeObjectURL(url)
          setIsSpeaking(false)
          onEnd?.()
        }
        await audio.play()
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        setIsSpeaking(false)
        onEnd?.()
        throw err
      }
    },
    [apiEndpoint, onPcmChunk, onAudioReady, onStart, onEnd, stop]
  )

  return { speak, stop, isSpeaking }
}
