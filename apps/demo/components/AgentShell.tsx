'use client'

import { useEffect, useRef } from 'react'

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

export interface AgentShellProps {
  /** Nombre que aparece en el header */
  agentName: string
  /** Color acento en hex — por defecto azul */
  accentColor?: string
  /** Slot donde va el <AgentAvatar /> */
  avatarSlot: React.ReactNode
  /** Estado textual del avatar para el badge */
  statusLabel?: string
  /** Historial de mensajes */
  messages: ChatMessage[]
  /** Valor del input */
  inputValue: string
  onInputChange: (v: string) => void
  /** Submit del formulario */
  onSend: (text: string) => void
  /** Deshabilita el input */
  disabled?: boolean
  /** Placeholder del input */
  placeholder?: string
  /** Nodo extra en el header (ej: botón de micrófono) */
  headerExtra?: React.ReactNode
  /** Clase CSS extra para el contenedor raíz */
  className?: string
}

export function AgentShell({
  agentName,
  accentColor = '#3b82f6',
  avatarSlot,
  statusLabel,
  messages,
  inputValue,
  onInputChange,
  onSend,
  disabled = false,
  placeholder = 'Escribe algo...',
  headerExtra,
  className = '',
}: AgentShellProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !disabled) onSend(inputValue)
  }

  return (
    <>
      {/* Variables CSS del acento — inyectadas inline para ser configurables */}
      <style>{`
        :root { --accent: ${accentColor}; --accent-20: ${accentColor}33; --accent-40: ${accentColor}66; }
      `}</style>

      <div
        className={`relative min-h-screen bg-[#050508] text-white flex flex-col overflow-hidden ${className}`}
      >
        {/* ── Fondo animado: grid + gradiente radial ── */}
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage: `
              radial-gradient(ellipse 80% 50% at 50% -10%, ${accentColor}18 0%, transparent 70%),
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '100% 100%, 40px 40px, 40px 40px',
          }}
        />

        {/* ── Header ── */}
        <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {/* Dot de estado */}
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: accentColor }}
            />
            <span className="font-semibold tracking-wide text-sm text-white/90">
              {agentName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {statusLabel && (
              <span
                className="text-xs px-2.5 py-1 rounded-full border font-mono tracking-widest uppercase"
                style={{ color: accentColor, borderColor: `${accentColor}44`, background: `${accentColor}11` }}
              >
                {statusLabel}
              </span>
            )}
            {headerExtra}
          </div>
        </header>

        {/* ── Cuerpo ── */}
        <div className="relative z-10 flex flex-1 flex-col items-center gap-6 px-4 pt-8 pb-4 overflow-hidden">

          {/* Avatar */}
          <div className="flex-shrink-0">
            {avatarSlot}
          </div>

          {/* Chat — crece y hace scroll */}
          <div className="w-full max-w-lg flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
            {messages.length === 0 && (
              <p className="text-center text-xs text-white/20 mt-8">
                Empieza una conversación...
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                    ${m.role === 'user'
                      ? 'rounded-br-sm text-white/90'
                      : 'rounded-bl-sm text-white/85 border border-white/8 backdrop-blur-sm'
                    }
                  `}
                  style={
                    m.role === 'user'
                      ? { background: `${accentColor}cc` }
                      : { background: 'rgba(255,255,255,0.04)' }
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Input bar ── */}
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg flex items-center gap-2 rounded-2xl border border-white/10 bg-white/4 backdrop-blur-md px-4 py-2.5"
            style={{ boxShadow: `0 0 0 1px ${accentColor}22` }}
          >
            <input
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={disabled ? 'Conectando...' : placeholder}
              disabled={disabled}
              className="flex-1 bg-transparent text-sm text-white placeholder-white/25
                         focus:outline-none disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={disabled || !inputValue.trim()}
              className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center
                         transition-all disabled:opacity-30 hover:scale-105 active:scale-95"
              style={{ background: accentColor }}
            >
              {/* Icono enviar */}
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </form>

        </div>
      </div>
    </>
  )
}
