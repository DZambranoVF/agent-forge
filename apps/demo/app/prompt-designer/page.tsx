'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { usePromptDesigner, TONE_OPTIONS, TONE_DESCRIPTIONS } from '@agent-forge/prompt-designer'
import type { Tone } from '@agent-forge/prompt-designer'

// ── Ejemplos precargados ──────────────────────────────────────────────────────
const PRESETS = [
  {
    label: 'Soporte e-commerce',
    purpose: 'Atiende clientes de una tienda online de ropa y calzado, resuelve dudas sobre pedidos, tallas, devoluciones y envíos',
    tone: 'amigable' as Tone,
    restrictions: 'No dar descuentos sin autorización, no prometer fechas de entrega exactas, no hablar de competidores',
    responseFormat: 'Respuestas cortas (máx 3 oraciones), siempre ofrecer ayuda adicional, emojis moderados',
    audience: 'Compradores online de 20-45 años, primera o segunda compra en la tienda',
    botName: 'Luna',
  },
  {
    label: 'Asistente técnico',
    purpose: 'Soporte técnico de primer nivel para usuarios de software de facturación empresarial',
    tone: 'técnico' as Tone,
    restrictions: 'No acceder a datos de clientes, no prometer fixes sin escalar al equipo de ingeniería, no dar accesos',
    responseFormat: 'Respuestas paso a paso numeradas, incluir capturas de pantalla o rutas de menú cuando aplique, máx 200 palabras',
    audience: 'Contadores y administradores de empresas medianas, conocimiento técnico básico-medio',
    botName: 'Nexus',
  },
  {
    label: 'Coach de bienestar',
    purpose: 'Acompaña a usuarios en sus hábitos de salud: sueño, ejercicio, nutrición y manejo del estrés',
    tone: 'empático' as Tone,
    restrictions: 'No dar diagnósticos médicos, siempre recomendar consultar un profesional para condiciones específicas, no juzgar hábitos del usuario',
    responseFormat: 'Tono cálido y motivador, preguntas de seguimiento para personalizar, máx 4 oraciones por respuesta',
    audience: 'Adultos de 25-50 años que quieren mejorar su calidad de vida sin compromisos extremos',
    botName: 'Vita',
  },
]

// ── Componente de conversación de prueba ──────────────────────────────────────
function ConversationPreview({ turns }: { turns: { role: string; content: string }[] }) {
  return (
    <div className="space-y-3">
      {turns.map((turn, i) => (
        <div
          key={i}
          className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              turn.role === 'user'
                ? 'bg-white/10 text-white/80 rounded-tr-sm'
                : 'bg-indigo-900/40 text-white/90 border border-indigo-500/30 rounded-tl-sm'
            }`}
          >
            <span className={`text-xs font-semibold block mb-1 ${turn.role === 'user' ? 'text-white/40' : 'text-indigo-400'}`}>
              {turn.role === 'user' ? 'Usuario' : 'Bot'}
            </span>
            {turn.content}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function PromptDesignerPage() {
  const { result, isLoading, error, generate, reset } = usePromptDesigner()
  const [copied, setCopied]     = useState(false)
  const [showRaw, setShowRaw]   = useState(false)

  // Form state
  const [purpose,        setPurpose]        = useState('')
  const [tone,           setTone]           = useState<Tone>('amigable')
  const [restrictions,   setRestrictions]   = useState('')
  const [responseFormat, setResponseFormat] = useState('')
  const [audience,       setAudience]       = useState('')
  const [botName,        setBotName]        = useState('')

  const handlePreset = (preset: typeof PRESETS[0]) => {
    setPurpose(preset.purpose)
    setTone(preset.tone)
    setRestrictions(preset.restrictions)
    setResponseFormat(preset.responseFormat)
    setAudience(preset.audience)
    setBotName(preset.botName)
    reset()
  }

  const handleGenerate = () => {
    generate({ purpose, tone, restrictions, responseFormat, audience, botName })
  }

  const handleCopy = () => {
    if (!result) return
    navigator.clipboard.writeText(result.systemPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-10">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Diseñador de System Prompts
          </h1>
          <p className="text-white/50 max-w-xl mx-auto">
            Completa el formulario y Claude diseña un <span className="text-white/80">system prompt profesional</span> con
            rol, tono, restricciones, formato, ejemplos few-shot y una conversación de prueba.
          </p>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          <span className="text-xs text-white/30 self-center">Ejemplos:</span>
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => handlePreset(p)}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/50 hover:text-white/80 hover:border-white/30 transition-all disabled:opacity-30"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Formulario ── */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Especificación del bot</h2>

            {/* Bot name */}
            <div>
              <label className="text-xs text-white/40 block mb-1">Nombre del bot (opcional)</label>
              <input
                value={botName}
                onChange={e => setBotName(e.target.value)}
                placeholder="Ej: Luna, Nexus, Vita..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {/* Purpose */}
            <div>
              <label className="text-xs text-white/40 block mb-1">¿Qué hace el bot? <span className="text-red-400">*</span></label>
              <textarea
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="Ej: Atiende clientes de una tienda online de ropa, resuelve dudas sobre pedidos y devoluciones"
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors resize-none"
              />
            </div>

            {/* Tone */}
            <div>
              <label className="text-xs text-white/40 block mb-1.5">Tono de comunicación</label>
              <div className="flex flex-wrap gap-2">
                {TONE_OPTIONS.map(t => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`text-sm px-3 py-1.5 rounded-lg border transition-all capitalize ${
                      tone === t
                        ? 'bg-white/15 border-white/40 text-white'
                        : 'bg-white/3 border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/25 mt-1.5">{TONE_DESCRIPTIONS[tone]}</p>
            </div>

            {/* Restrictions */}
            <div>
              <label className="text-xs text-white/40 block mb-1">¿Qué NO puede hacer? (restricciones)</label>
              <textarea
                value={restrictions}
                onChange={e => setRestrictions(e.target.value)}
                placeholder="Ej: No dar descuentos sin autorización, no prometer fechas exactas de entrega"
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors resize-none"
              />
            </div>

            {/* Response format */}
            <div>
              <label className="text-xs text-white/40 block mb-1">Formato de respuesta</label>
              <input
                value={responseFormat}
                onChange={e => setResponseFormat(e.target.value)}
                placeholder="Ej: Máx 3 oraciones, siempre ofrecer ayuda adicional, emojis moderados"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {/* Audience */}
            <div>
              <label className="text-xs text-white/40 block mb-1">Audiencia objetivo</label>
              <input
                value={audience}
                onChange={e => setAudience(e.target.value)}
                placeholder="Ej: Compradores online de 20-45 años, primera compra en la tienda"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isLoading || !purpose.trim()}
              className="w-full bg-white text-black font-semibold py-3 rounded-xl text-sm hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? 'Generando system prompt...' : 'Diseñar System Prompt'}
            </button>

            {error && <p className="text-red-400 text-xs">{error}</p>}
          </div>

          {/* ── Resultado ── */}
          <div className="space-y-4">

            {/* Skeleton loading */}
            {isLoading && (
              <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-1/3" />
                <div className="space-y-2">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-3 bg-white/10 rounded" style={{ width: `${70 + (i % 3) * 10}%` }} />
                  ))}
                </div>
                <div className="h-4 bg-white/10 rounded w-1/4 mt-4" />
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`h-12 bg-white/5 rounded-2xl ${i % 2 === 0 ? 'ml-auto w-3/4' : 'w-4/5'}`} />
                  ))}
                </div>
              </div>
            )}

            {/* Resultado */}
            {result && !isLoading && (
              <>
                {/* System Prompt */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">System Prompt generado</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowRaw(r => !r)}
                        className="text-xs text-white/40 hover:text-white/70 border border-white/10 hover:border-white/25 px-2 py-1 rounded-lg transition-colors"
                      >
                        {showRaw ? 'Formato' : 'Raw'}
                      </button>
                      <button
                        onClick={handleCopy}
                        className="text-xs text-white/70 hover:text-white border border-white/20 hover:border-white/40 px-3 py-1 rounded-lg transition-colors"
                      >
                        {copied ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                  <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-4 max-h-64 overflow-y-auto">
                    {showRaw ? (
                      <pre className="text-xs text-white/70 whitespace-pre-wrap font-mono leading-relaxed">{result.systemPrompt}</pre>
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none text-white/75">
                        <ReactMarkdown>{result.systemPrompt}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>

                {/* Técnicas */}
                <div>
                  <h3 className="text-xs text-white/40 uppercase tracking-wider mb-2">Técnicas de prompting usadas</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.techniques?.map((t: string) => (
                      <span key={t} className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Análisis */}
                {result.analysis && (
                  <div className="bg-white/3 border border-white/10 rounded-xl p-3">
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Análisis</p>
                    <p className="text-sm text-white/60 leading-relaxed">{result.analysis}</p>
                  </div>
                )}

                {/* Conversación de prueba */}
                <div>
                  <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Conversación de prueba</h3>
                  <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                    <ConversationPreview turns={result.testConversation} />
                  </div>
                </div>

                {/* Regenerar */}
                <button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl text-sm border border-white/15 text-white/50 hover:text-white hover:border-white/30 transition-all"
                >
                  Regenerar
                </button>
              </>
            )}

            {/* Estado vacío */}
            {!result && !isLoading && (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-white/30 text-sm">Completa el formulario y genera tu system prompt</p>
                <p className="text-white/20 text-xs mt-1">O usa un ejemplo precargado para ver el resultado</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
