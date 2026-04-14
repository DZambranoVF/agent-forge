# AgentForge — Módulos reutilizables para agentes IA

> **Nombre de trabajo:** `agent-forge` (renombrar al confirmar nombre final)
> **GCP Project:** `deia-projects` (deia.solutionss@gmail.com / ddzs2014@gmail.com)
> **GitHub:** pendiente crear — `gh repo create agent-forge --public`
> **Fecha objetivo reto:** Jueves 16-Apr-2026

---

## Concepto

Toolkit de módulos independientes para agentes IA. Cada módulo es un paquete React/TS
autocontenido que puede enchufarse en cualquier proyecto para el reto hackathon.

---

## Stack global

| Capa | Tech |
|------|------|
| Frontend | React 19 + TypeScript + Vite |
| Animaciones | Framer Motion |
| Avatar realtime | **Simli** (`simli-client` v1.2.15 + `@simli/simli-react` v1.0.0) — latencia <300ms |
| Avatar fallback | SVG animado custom con Web Audio API (sin costo) |
| Voz salida | ElevenLabs TTS — formato PCM16 16kHz mono (compatible directo con Simli) |
| Voz entrada | Web Speech API (gratis) |
| LLM | Claude API (`claude-sonnet-4-6`) — Anthropic SDK |
| Auth | Firebase Auth (Google OAuth) — whitelist: deia.solutionss@gmail.com, ddzs2014@gmail.com |
| Hosting demo | Firebase Hosting — proyecto `deia-projects` |
| API keys | `.env.local` — NUNCA exponer Simli key al cliente |

> **HeyGen DESCARTADO** — latencia real de 6-9s, inutilizable para conversación fluida.

---

## Arquitectura del avatar (flujo principal)

```
[Usuario escribe/habla]
        ↓
   Claude API (streaming) → texto completo
        ↓
   ElevenLabs TTS → audio PCM16 16kHz mono
        ↓
   simliClient.sendAudioData(pcm16Bytes)   ← stream de bytes directo
        ↓
   Simli WebRTC → video animado <300ms latencia
        ↓
   <video> en pantalla — boca + ojos animados en tiempo real
```

### Modo fallback (sin créditos Simli)
```
   Claude API → ElevenLabs WebSocket TTS → ArrayBuffer de audio
        ↓
   Web Audio API AudioAnalyser → amplitud frame-by-frame
        ↓
   SVG Avatar → boca sincronizada + estados animados
```

### Nota clave ElevenLabs → Simli
ElevenLabs debe configurarse con `output_format: "pcm_16000"` para que el audio
sea PCM16 a 16kHz mono — el único formato que Simli acepta directamente sin
conversión adicional.

### Estados del avatar
| Estado | Trigger |
|--------|---------|
| `idle` | Sin actividad — respiración + parpadeo |
| `listening` | Usuario hablando/escribiendo — ondas de entrada |
| `thinking` | Esperando respuesta Claude — ojos moviéndose |
| `talking` | Avatar hablando — boca sync con audio |
| `error` | Fallo de conexión — expresión neutra |

---

## Módulos

### `packages/avatar` — Avatar animado ⭐ (PRIORIDAD 1)
- Componente React: `<AgentAvatar state="idle|listening|thinking|talking" />`
- Implementación A: HeyGen WebRTC streaming (pro)
- Implementación B: SVG + Web Audio fallback
- Props: `avatarId`, `voiceId`, `state`, `onReady`, `onError`
- HeyGen: Lite Mode — 1 crédito/min, 10 min free tier

### `packages/voice-out` — TTS ElevenLabs (PRIORIDAD 1)
- Hook: `useVoiceOut({ voiceId, apiKey })`
- Streaming WebSocket para baja latencia
- Expone: `speak(text)`, `stop()`, `amplitude` (para sync con avatar SVG)
- Voz Freddy: configurar via ElevenLabs Instant Voice Clone o preset

### `packages/brain` — LLM Claude
- Hook: `useBrain({ systemPrompt, conversationId })`
- Claude `claude-sonnet-4-6` con streaming
- Memoria de conversación (array de mensajes en estado)
- Expone: `ask(userMessage)`, `reset()`, `isThinking`
- System prompts intercambiables por JSON

### `packages/voice-in` — STT
- Hook: `useVoiceIn()`
- Web Speech API (gratis, funciona en Chrome)
- Expone: `startListening()`, `stopListening()`, `transcript`, `isListening`
- Fallback: input de texto si STT no disponible

### `packages/ui-shell` — Layout base futurista
- Componente: `<AgentShell title logoUrl theme="dark|light" />`
- Tema oscuro por defecto: `#0a0a0a` + acento configurable
- Incluye: header, área de avatar, área de chat, controles de voz
- Glassmorphism + gradientes

### `packages/doc-qa` — Q&A sobre documentos (FASE 2)
- Upload PDF/CSV → Claude con contenido como contexto
- Hook: `useDocQA()`

---

## Estructura de archivos

```
agent-forge/
├── CLAUDE.md                    ← este archivo
├── package.json                 ← workspace root (pnpm workspaces)
├── pnpm-workspace.yaml
├── apps/
│   └── demo/                   ← Next.js 14 app de demo unificada
│       ├── app/
│       │   ├── page.tsx
│       │   └── api/
│       │       ├── brain/route.ts
│       │       └── token/route.ts   ← HeyGen session token (server-side)
│       └── .env.local
└── packages/
    ├── avatar/                 ← @agent-forge/avatar
    ├── voice-out/              ← @agent-forge/voice-out
    ├── brain/                  ← @agent-forge/brain
    ├── voice-in/               ← @agent-forge/voice-in
    └── ui-shell/               ← @agent-forge/ui-shell
```

---

## Credenciales (apps/demo/.env.local)

```env
# Claude
ANTHROPIC_API_KEY=sk-ant-...

# ElevenLabs
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=           ← completar con voice ID de "Freddy"

# HeyGen
HEYGEN_API_KEY=                ← crear cuenta en heygen.com → API
HEYGEN_AVATAR_ID=              ← ID del avatar elegido en HeyGen dashboard

# Firebase (deia-projects)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=deia-projects
```

> **IMPORTANTE**: El token de sesión HeyGen NUNCA va al cliente — siempre generarlo en `/api/token/route.ts`

---

## Simli — Notas de integración

- **Latencia real**: <300ms desde audio hasta video animado
- **Cara custom**: subir foto en `app.simli.com` → obtener `faceId` UUID
- **Cara de Freddy**: subir foto de Freddy Vega → `SIMLI_FACE_ID` en .env
- **Audio**: PCM16, 16kHz, mono, chunks de ~6000 bytes
- **ElevenLabs**: configurar `output_format: "pcm_16000"` → enviar bytes directo a `sendAudioData()`
- **Free tier**: 50 min/mes + $10 créditos iniciales (~200 min a $0.05/min)
- **Session max**: 30 min por sesión, 5 min idle timeout
- **SDK**: `simli-client` v1.2.15 (bajo nivel) + `@simli/simli-react` v1.0.0 (componente React)
- **El token Simli NUNCA va al cliente** — generar session token en `/api/simli-token/route.ts`
- **Referencia demo**: https://github.com/simliai/simli-ai-agent-demo

---

## GCP — deia-projects

```bash
# Cambiar cuenta gcloud antes de operar
gcloud config set account deia.solutionss@gmail.com
gcloud config set project deia-projects

# Firebase hosting (demo)
firebase use deia-projects
firebase deploy --only hosting
```

---

## GitHub (al final del día)

```bash
# Instalar gh CLI si no está
winget install GitHub.cli

# Crear repo
gh auth login    # con deia.solutionss@gmail.com o ddzs2014@gmail.com
gh repo create agent-forge --public --source=. --remote=origin --push
```

---

## Comandos de desarrollo

```bash
cd C:\Users\asus\agent-forge

# Instalar todo (pnpm workspaces)
pnpm install

# Demo app
pnpm --filter demo dev        # localhost:3000

# Build todos los paquetes
pnpm --filter "./packages/**" build
```

---

## Sesión actual — progreso

- [x] Estructura de carpetas creada
- [x] CLAUDE.md con arquitectura completa
- [ ] Configurar pnpm workspaces + package.json raíz
- [ ] `packages/avatar` — componente HeyGen Streaming
- [ ] `packages/voice-out` — hook ElevenLabs
- [ ] `packages/brain` — hook Claude API
- [ ] `apps/demo` — app unificada
- [ ] Conseguir credenciales HeyGen
- [ ] Voice clone de Freddy en ElevenLabs
- [ ] Deploy demo en Firebase Hosting
- [ ] Push a GitHub

---

## Decisiones pendientes

1. **Nombre final del proyecto** — decidir al final del día antes del push a GitHub
2. **Face ID Simli** — subir foto a `app.simli.com` y guardar UUID en .env
3. **Voz Freddy en ElevenLabs** — Instant Voice Clone (subir ~1 min de audio) vs preset
4. **Simli API Key** — crear cuenta en `simli.ai` → API Keys
