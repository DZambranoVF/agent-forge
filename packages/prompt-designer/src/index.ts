'use client'

import { useState } from 'react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type Tone = 'amigable' | 'formal' | 'técnico' | 'empático' | 'divertido'

export interface PromptDesignerInput {
  purpose: string          // ¿Qué hace el bot?
  tone: Tone               // Tono de comunicación
  restrictions: string     // Qué NO puede hacer
  responseFormat: string   // Cómo debe responder (largo, estilo, etc.)
  audience: string         // A quién se dirige
  botName?: string         // Nombre del bot (opcional)
}

export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface PromptDesignerResult {
  systemPrompt: string           // el system prompt generado
  testConversation: ConversationTurn[]  // 3-4 turnos de prueba
  techniques: string[]           // técnicas de prompting usadas
  analysis: string               // análisis breve del prompt
}

// ── Tono → descripción para Claude ───────────────────────────────────────────

export const TONE_DESCRIPTIONS: Record<Tone, string> = {
  amigable:  'cálido, cercano, usa lenguaje informal pero respetuoso, emojis ocasionales',
  formal:    'profesional, distante, vocabulario preciso, sin contracciones ni emojis',
  técnico:   'orientado a detalles, usa terminología del dominio, asume conocimiento base',
  empático:  'comprensivo, valida emociones, prioriza el bienestar del usuario',
  divertido: 'energético, usa humor ligero, referencias culturales, mantiene utilidad',
}

export const TONE_OPTIONS: Tone[] = ['amigable', 'formal', 'técnico', 'empático', 'divertido']

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePromptDesigner(apiEndpoint = '/api/prompt-designer') {
  const [result, setResult]     = useState<PromptDesignerResult | null>(null)
  const [isLoading, setLoading] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const generate = async (input: PromptDesignerInput) => {
    if (!input.purpose.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data: PromptDesignerResult = await res.json()
      setResult(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setResult(null)
    setError(null)
  }

  return { result, isLoading, error, generate, reset }
}
