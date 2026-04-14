'use client'

import { useCallback, useRef, useState } from 'react'

/** Convierte un AudioBuffer (cualquier sample rate) a PCM16 16kHz mono para Simli */
function audioBufferToPcm16(buf: AudioBuffer): Uint8Array {
  const srcRate = buf.sampleRate
  const dstRate = 16000
  const ratio = srcRate / dstRate
  const src = buf.getChannelData(0)
  const numSamples = Math.floor(buf.length / ratio)
  const pcm = new Int16Array(numSamples)
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, src[Math.min(Math.round(i * ratio), src.length - 1)]))
    pcm[i] = s < 0 ? s * 32768 : s * 32767
  }
  return new Uint8Array(pcm.buffer)
}
import { AgentAvatar, AvatarState } from '@/components/AgentAvatar'
import { AgentShell, ChatMessage } from '@/components/AgentShell'

const SYSTEM_PROMPT = `Eres un agente de IA asistente inteligente y amigable.
Responde siempre en español, de forma concisa y natural — como si estuvieras hablando en voz alta.
Máximo 3 oraciones por respuesta.`

const FACE_ID = process.env.NEXT_PUBLIC_SIMLI_FACE_ID || ''

const STATUS_LABELS: Record<AvatarState, string> = {
  idle:      'en espera',
  listening: 'escuchando',
  thinking:  'pensando',
  talking:   'hablando',
  error:     'error',
}

export default function Home() {
  const [avatarState, setAvatarState] = useState<AvatarState>('idle')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isReady, setIsReady] = useState(false)

  const sendAudioRef = useRef<((chunk: Uint8Array) => void) | null>(null)
  const messagesRef = useRef<{ role: string; content: string }[]>([])
  // Elemento de audio pre-desbloqueado en el gesto del usuario para garantizar play() posterior
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null)
  const busy = avatarState === 'thinking' || avatarState === 'talking'

  const handleClientReady = useCallback(({ sendAudio }: {
    sendAudio: (chunk: Uint8Array) => void
  }) => {
    sendAudioRef.current = sendAudio
    setIsReady(true)
    setAvatarState('idle')
  }, [])

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || busy) return

    // Desbloquear el elemento de audio AQUÍ — dentro del gesto del usuario, antes de cualquier await
    // Esto garantiza que play() pueda llamarse más tarde sin que Chrome lo bloquee
    if (!playbackAudioRef.current) {
      playbackAudioRef.current = document.createElement('audio')
    }
    playbackAudioRef.current.muted = true
    playbackAudioRef.current.play().catch(() => {})  // unlock silencioso

    setInput('')
    setMessages(prev => [...prev, { role: 'user', text }])
    setAvatarState('thinking')

    messagesRef.current = [...messagesRef.current, { role: 'user', content: text }]

    try {
      // 1. Claude responde en streaming
      console.log('[brain] llamando /api/brain...')
      const brainRes = await fetch('/api/brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesRef.current, systemPrompt: SYSTEM_PROMPT }),
      })
      if (!brainRes.ok) throw new Error(`Brain error: ${brainRes.status}`)

      let fullText = ''
      const reader = brainRes.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ') && line.slice(6) !== '[DONE]') {
            fullText += line.slice(6)
          }
        }
      }
      console.log('[brain] respuesta completa:', fullText.slice(0, 80), '...')

      messagesRef.current = [...messagesRef.current, { role: 'assistant', content: fullText }]
      setMessages(prev => [...prev, { role: 'assistant', text: fullText }])

      // 2. ElevenLabs PCM16 → Simli (animación) + AudioContext (audio del usuario)
      setAvatarState('talking')
      console.log('[voice] llamando /api/voice...')

      const voiceRes = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText }),
      })
      if (!voiceRes.ok) {
        const err = await voiceRes.text()
        throw new Error(`Voice error ${voiceRes.status}: ${err}`)
      }

      if (voiceRes.body) {
        // Recoger todos los bytes MP3
        const audioReader = voiceRes.body.getReader()
        let allBytes = new Uint8Array(0)
        while (true) {
          const { done, value } = await audioReader.read()
          if (done) break
          if (value) {
            const merged = new Uint8Array(allBytes.byteLength + value.byteLength)
            merged.set(allBytes); merged.set(value, allBytes.byteLength)
            allBytes = merged
          }
        }
        console.log('[voice] MP3 bytes:', allBytes.byteLength)

        if (allBytes.byteLength > 0 && playbackAudioRef.current) {
          // 1. Crear blob URL del MP3 y asignarlo al elemento pre-desbloqueado
          const mp3Blob = new Blob([allBytes], { type: 'audio/mpeg' })
          const url = URL.createObjectURL(mp3Blob)
          const audio = playbackAudioRef.current
          audio.muted = false
          audio.src = url
          audio.load()

          // 2. Decodificar MP3 → PCM16 16kHz → enviar a Simli para animación de boca
          try {
            const decodeCtx = new AudioContext()
            const arrayBuf = allBytes.buffer.slice(allBytes.byteOffset, allBytes.byteOffset + allBytes.byteLength)
            const decoded = await decodeCtx.decodeAudioData(arrayBuf)
            decodeCtx.close()
            const pcm16 = audioBufferToPcm16(decoded)
            const CHUNK = 6000
            for (let i = 0; i < pcm16.byteLength; i += CHUNK) {
              sendAudioRef.current?.(pcm16.slice(i, Math.min(i + CHUNK, pcm16.byteLength)))
            }
            console.log('[simli] PCM16 enviado:', pcm16.byteLength, 'bytes')
          } catch (e) {
            console.warn('[decode] error al decodificar MP3:', e)
          }

          // 3. Reproducir MP3 y esperar que termine
          console.log('[audio] reproduciendo MP3')
          await new Promise<void>(resolve => {
            audio.onended = () => { URL.revokeObjectURL(url); resolve() }
            audio.onerror = (e) => { console.error('[audio] error:', e); URL.revokeObjectURL(url); resolve() }
            audio.play().catch(e => { console.error('[audio] play() bloqueado:', e); resolve() })
          })
        }
      } else {
        console.warn('[voice] sin body en la respuesta')
      }
    } catch (err) {
      console.error('[handleSend] error:', err)
      setAvatarState('error')
      return
    }

    setAvatarState('idle')
  }, [busy])

  return (
    <AgentShell
      agentName="Agent Demo"
      accentColor="#3b82f6"
      statusLabel={STATUS_LABELS[avatarState]}
      messages={messages}
      inputValue={input}
      onInputChange={setInput}
      onSend={handleSend}
      disabled={!isReady || busy}
      placeholder={isReady ? 'Escribe algo...' : 'Conectando avatar...'}
      avatarSlot={
        <AgentAvatar
          faceId={FACE_ID}
          state={avatarState}
          onReady={() => setAvatarState('idle')}
          onError={(e) => { console.error('[avatar] error definitivo:', e); setAvatarState('error') }}
          onClientReady={handleClientReady}
        />
      }
    />
  )
}
