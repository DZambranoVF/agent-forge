'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { usePromptLevels, LEVEL_META } from '@agent-forge/prompt-levels'
import type { PromptLevelResult } from '@agent-forge/prompt-levels'

// ── Ejemplos rápidos ──────────────────────────────────────────────────────────
const EXAMPLES = [
  'Explica cómo funciona la inteligencia artificial',
  'Qué es blockchain y para qué sirve',
  'Cómo funciona una API REST',
  'Qué es el aprendizaje automático',
  'Explica qué es Docker',
]

// ── Columna de resultado ──────────────────────────────────────────────────────
function LevelCard({ result, loading }: { result?: PromptLevelResult; loading: boolean }) {
  const [showPrompt, setShowPrompt] = useState(false)

  const meta = result?.meta ?? LEVEL_META[result?.level ?? 'basic']

  if (loading) {
    return (
      <div className={`flex-1 min-w-0 rounded-xl border ${meta.border} ${meta.color} p-5 flex flex-col gap-4`}>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${meta.badge}`}>{meta.label}</span>
        </div>
        <div className="space-y-3 animate-pulse">
          <div className="h-3 bg-white/10 rounded w-full" />
          <div className="h-3 bg-white/10 rounded w-5/6" />
          <div className="h-3 bg-white/10 rounded w-4/6" />
          <div className="h-3 bg-white/10 rounded w-full" />
          <div className="h-3 bg-white/10 rounded w-3/6" />
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className={`flex-1 min-w-0 rounded-xl border ${meta.border} ${meta.color} p-5 flex flex-col gap-3`}>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${meta.badge} self-start`}>{meta.label}</span>
        <p className="text-white/30 text-sm italic">{meta.subtitle}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {meta.techniques.map(t => (
            <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">{t}</span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex-1 min-w-0 rounded-xl border ${result.meta.border} ${result.meta.color} p-5 flex flex-col gap-4`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${result.meta.badge}`}>{result.meta.label}</span>
          <p className="text-white/50 text-xs mt-1">{result.meta.subtitle}</p>
        </div>
        <button
          onClick={() => setShowPrompt(p => !p)}
          className="text-xs text-white/40 hover:text-white/70 border border-white/10 hover:border-white/30 px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
        >
          {showPrompt ? 'Ocultar prompt' : 'Ver prompt'}
        </button>
      </div>

      {/* Técnicas usadas */}
      <div className="flex flex-wrap gap-1.5">
        {result.meta.techniques.map(t => (
          <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/10">{t}</span>
        ))}
      </div>

      {/* Prompt usado (colapsable) */}
      {showPrompt && (
        <div className="bg-black/40 rounded-lg p-3 border border-white/10">
          <p className="text-xs font-semibold text-white/40 mb-2 uppercase tracking-wider">Prompt enviado</p>
          <pre className="text-xs text-white/60 whitespace-pre-wrap font-mono leading-relaxed">{result.prompt}</pre>
        </div>
      )}

      {/* Respuesta */}
      <div className="prose prose-invert prose-sm max-w-none text-white/80 leading-relaxed">
        <ReactMarkdown>{result.response}</ReactMarkdown>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function PromptLevelsPage() {
  const [input, setInput] = useState('')
  const { results, isLoading, error, compare, reset } = usePromptLevels()

  const handleSubmit = (task?: string) => {
    const t = task ?? input
    if (t.trim()) compare(t)
    if (task) setInput(task)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-10">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Comparador de Niveles de Prompt
          </h1>
          <p className="text-white/50 max-w-xl mx-auto">
            Escribe una tarea y ve cómo el <span className="text-white/80">mismo pedido</span> produce
            resultados completamente distintos según cómo lo formules.
          </p>
        </div>

        {/* Input */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Ej: Explica cómo funciona la inteligencia artificial"
              className="flex-1 bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm placeholder-white/30 focus:outline-none focus:border-white/40 transition-colors"
            />
            <button
              onClick={() => handleSubmit()}
              disabled={isLoading || !input.trim()}
              className="bg-white text-black font-semibold px-5 py-3 rounded-xl text-sm hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? 'Comparando...' : 'Comparar'}
            </button>
            {results && (
              <button
                onClick={() => { reset(); setInput('') }}
                className="px-4 py-3 rounded-xl text-sm border border-white/15 text-white/50 hover:text-white hover:border-white/30 transition-all"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Ejemplos rápidos */}
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs text-white/30">Ejemplos:</span>
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => handleSubmit(ex)}
                disabled={isLoading}
                className="text-xs text-white/40 hover:text-white/70 border border-white/10 hover:border-white/25 px-2 py-1 rounded-full transition-colors disabled:opacity-30"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-center text-red-400 text-sm mb-6">{error}</p>
        )}

        {/* Leyenda de niveles (antes de comparar) */}
        {!results && !isLoading && (
          <div className="max-w-2xl mx-auto mb-10">
            <div className="grid grid-cols-3 gap-3 text-center">
              {(['basic', 'medium', 'advanced'] as const).map(level => {
                const meta = LEVEL_META[level]
                return (
                  <div key={level} className={`rounded-xl border ${meta.border} ${meta.color} p-4`}>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${meta.badge}`}>{meta.label}</span>
                    <p className="text-white/40 text-xs mt-2">{meta.subtitle}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Columnas de resultado */}
        <div className="flex flex-col lg:flex-row gap-4">
          {(['basic', 'medium', 'advanced'] as const).map(level => (
            <LevelCard
              key={level}
              result={results?.[level]}
              loading={isLoading}
            />
          ))}
        </div>

        {/* Footer explicativo */}
        {results && (
          <div className="mt-8 p-5 rounded-xl bg-white/3 border border-white/10 max-w-3xl mx-auto text-center">
            <p className="text-white/50 text-sm leading-relaxed">
              Los tres prompts enviaron la misma tarea:{' '}
              <span className="text-white/70 italic">&ldquo;{results.task}&rdquo;</span>.
              La diferencia está en cómo se le da <strong className="text-white/80">contexto, rol y estructura</strong> a Claude.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
