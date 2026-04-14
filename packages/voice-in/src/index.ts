import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseVoiceInOptions {
  lang?: string           // default: 'es-ES'
  continuous?: boolean    // default: false — para frases completas
  onResult?: (transcript: string) => void
  onError?: (error: string) => void
}

export interface UseVoiceInReturn {
  isListening: boolean
  transcript: string
  startListening: () => void
  stopListening: () => void
  isSupported: boolean
}

export function useVoiceIn({
  lang = 'es-ES',
  continuous = false,
  onResult,
  onError,
}: UseVoiceInOptions = {}): UseVoiceInReturn {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  const startListening = useCallback(() => {
    if (!isSupported) {
      onError?.('Web Speech API no soportada en este navegador')
      return
    }

    const SpeechRecognitionApi =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition

    const recognition = new SpeechRecognitionApi()
    recognition.lang = lang
    recognition.continuous = continuous
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[event.results.length - 1][0].transcript.trim()
      setTranscript(text)
      onResult?.(text)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      onError?.(event.error)
      setIsListening(false)
    }

    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
  }, [isSupported, lang, continuous, onResult, onError])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  return { isListening, transcript, startListening, stopListening, isSupported }
}
