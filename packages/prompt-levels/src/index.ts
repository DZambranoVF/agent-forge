'use client'

import { useState } from 'react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type PromptLevel = 'basic' | 'medium' | 'advanced'

export interface LevelMeta {
  label: string
  subtitle: string
  color: string        // tailwind bg color class
  border: string       // tailwind border color class
  badge: string        // tailwind badge bg class
  techniques: string[]
}

export interface PromptLevelResult {
  level: PromptLevel
  prompt: string       // el prompt que se mandó a Claude
  response: string     // la respuesta de Claude
  meta: LevelMeta
}

export interface PromptLevelResults {
  task: string
  basic: PromptLevelResult
  medium: PromptLevelResult
  advanced: PromptLevelResult
}

// ── Metadata visual de cada nivel ─────────────────────────────────────────────

export const LEVEL_META: Record<PromptLevel, LevelMeta> = {
  basic: {
    label: 'Básico',
    subtitle: 'Prompt directo sin contexto',
    color: 'bg-red-950/30',
    border: 'border-red-500/40',
    badge: 'bg-red-500/20 text-red-300',
    techniques: ['Tarea en texto plano', 'Sin rol', 'Sin formato', 'Sin restricciones'],
  },
  medium: {
    label: 'Medio',
    subtitle: 'Rol + contexto + límites',
    color: 'bg-yellow-950/30',
    border: 'border-yellow-500/40',
    badge: 'bg-yellow-500/20 text-yellow-300',
    techniques: ['Rol definido', 'Contexto básico', 'Límite de longitud', 'Instrucción de formato'],
  },
  advanced: {
    label: 'Avanzado',
    subtitle: 'Ingeniería de prompts completa',
    color: 'bg-emerald-950/30',
    border: 'border-emerald-500/40',
    badge: 'bg-emerald-500/20 text-emerald-300',
    techniques: ['Rol experto detallado', 'Audiencia definida', 'Cadena de razonamiento', 'Formato estructurado', 'Restricciones claras', 'Few-shot implícito'],
  },
}

// ── Constructores de prompt por nivel ─────────────────────────────────────────

export function buildBasicPrompt(task: string): string {
  return task
}

export function buildMediumPrompt(task: string): string {
  return `Eres un asistente experto y servicial. Tu objetivo es responder con claridad.

Tarea: ${task}

Instrucciones:
- Responde en 2 a 3 párrafos bien organizados.
- Usa lenguaje claro, sin jerga innecesaria.
- Concluye con una idea práctica o accionable.`
}

export function buildAdvancedPrompt(task: string): string {
  return `Eres un educador experto con amplia experiencia explicando conceptos complejos a audiencias diversas. Tu fortaleza es hacer que lo difícil parezca sencillo sin perder precisión.

## Audiencia
Profesional educado que busca profundidad sin tecnicismos excesivos. Valora los ejemplos concretos sobre las definiciones abstractas.

## Tu proceso de respuesta
1. Definición concisa (1-2 oraciones): qué es en términos simples
2. Por qué importa: el problema real que resuelve o la oportunidad que representa
3. Analogía del mundo real: conecta con algo cotidiano y familiar
4. Ejemplo práctico concreto: cómo se ve en acción
5. Insight clave: la idea que se debe recordar

## Restricciones
- Máximo 400 palabras
- Si usas un término técnico, defínelo inmediatamente después
- Usa markdown: headers, bullets donde mejoren la claridad
- No repitas ideas entre secciones
- Tono: conversacional pero riguroso

## Tarea
${task}`
}

export function buildPrompt(level: PromptLevel, task: string): string {
  if (level === 'basic')    return buildBasicPrompt(task)
  if (level === 'medium')   return buildMediumPrompt(task)
  return buildAdvancedPrompt(task)
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePromptLevels(apiEndpoint = '/api/prompt-levels') {
  const [results, setResults]   = useState<PromptLevelResults | null>(null)
  const [isLoading, setLoading] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const compare = async (task: string) => {
    if (!task.trim()) return
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: task.trim() }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data: PromptLevelResults = await res.json()
      setResults(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setResults(null)
    setError(null)
  }

  return { results, isLoading, error, compare, reset }
}
