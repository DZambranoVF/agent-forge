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

### ✅ `packages/business-data` — Config JSON → Claude Tools (COMPLETADO)
**Propósito:** Convertir cualquier negocio (productos, servicios, horarios, FAQs, PQRs) en un agente Claude totalmente funcional sin código custom.

**Exports:**
```typescript
// src/index.ts
export type BusinessConfig { name, description, industry?, contact, hours, products?, services?, faqs?, promotions?, policies?, staff?, agentPersonality? }
export function buildSystemPrompt(config: BusinessConfig): string
```
```typescript
// src/tools.ts (server-side only)
export interface ServerTool { name, description, input_schema, execute(input) }
export function createBusinessTools(config: BusinessConfig): ServerTool[]
```

**Tipos principales:**
- `Product` — id, name, description, price, currency, category, features, available, sku, imageUrl
- `Service` — id, name, description, price, currency, duration, category, available, requiresAppointment
- `FAQ` — question, answer, category
- `Promotion` — name, description, discount, validUntil, conditions, applicableTo
- `BusinessHours` — { [day]: "HH:MM - HH:MM" }
- `BusinessPolicies` — returns, shipping, payment, warranty
- `StaffMember` — name, role, specialties, available
- `BusinessContact` — phone, email, website, whatsapp, address, city, country, googleMaps
- `PQRResult` — ticketId, type, status, createdAt, message

**Herramientas autogeneradas (max 7, condicionales):**
1. `buscar_productos` — filtrar por query, category, max_price; retorna top 6
2. `buscar_servicios` — filtrar por query, category
3. `consultar_horarios` — horarios generales o de un día específico
4. `buscar_faq` — búsqueda fuzzy en preguntas + respuestas
5. `consultar_promociones` — filtro opcional por query
6. `registrar_pqr` — crea ticket `PQR-{timestamp_base36}` con tipo (queja/pregunta/reclamo)
7. `consultar_equipo` — filtrar staff por specialties/role

**System Prompt dinámico:**
- Inyecta agentPersonality con placeholder `{name}`
- Nombre, descripción, industria del negocio
- Horarios, contacto, políticas (returns, shipping, payment, warranty)
- Instrucciones de comportamiento (idioma, límite de oraciones, sugerencias de productos)

**Uso:**
```typescript
import businessData from './business.example.json'
import { buildSystemPrompt, createBusinessTools } from '@agent-forge/business-data'

const systemPrompt = buildSystemPrompt(businessData)
const tools = createBusinessTools(businessData)
// Pasar a Claude API + frontend hook
```

### ✅ `packages/tools` — `useAgent` Hook (COMPLETADO)
**Propósito:** Cliente React que maneja agentic loop de forma simple con SSE.

**Hook signature:**
```typescript
export interface UseAgentOptions {
  apiEndpoint?: string        // default: '/api/agent'
  businessConfig?: Record<string, unknown>
  systemPrompt?: string
  onChunk?: (chunk: string) => void     // cada carácter/bloque de texto
  onDone?: (fullText: string) => void   // cuando el agente termina
  onToolCall?: (toolName: string) => void  // cuando usa una herramienta
}

export interface UseAgentReturn {
  messages: Message[]         // historial completo
  isThinking: boolean        // esperando respuesta Claude
  activeToolName: string | null  // herramienta en ejecución
  ask: (userMessage: string) => Promise<string>
  reset: () => void
  lastResponse: string       // último texto del agente
}

export function useAgent(options: UseAgentOptions): UseAgentReturn
```

**Flujo SSE interno:**
- Conecta a `POST /api/agent`
- Envía: `{ messages, systemPrompt, businessConfig }`
- Recibe stream SSE:
  - `data: [TOOL:nombre_herramienta]` → actualiza `activeToolName`
  - `data: texto...` → acumula en `lastResponse`
  - `data: [DONE]` → cierra stream, resuelve Promise

**Nota clave:** Usa ref interno para evitar stale closure — historial siempre actualizado.

### ✅ `apps/demo/app/api/agent/route.ts` — Agentic Loop Servidor (COMPLETADO)
**Propósito:** Loop servidor-side de Claude con tool use (max 8 iteraciones).

**Flujo:**
```
1. POST /api/agent { messages, systemPrompt, businessConfig }
2. buildSystemPrompt() → system
3. createBusinessTools(businessConfig) → tools array
4. LOOP (hasta max 8 iteraciones):
   a. client.messages.create({ system, messages, tools })
   b. Si stop_reason === 'tool_use':
      - Ejecutar todos los tool_use blocks
      - SSE: enviar [TOOL:nombre] antes de cada herramienta
      - Acumular resultados en tool_result
      - Push resultados al historial → siguiente iteración
   c. Si stop_reason === 'end_turn':
      - Extraer texto del response
      - Stream carácter-por-carácter como SSE
      - Enviar [DONE]
5. Return ReadableStream (SSE headers)
```

**Headers SSE:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

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
├── CLAUDE.md                           ← este archivo
├── README.md                           ← documentación pública
├── package.json                        ← workspace root (pnpm workspaces)
├── pnpm-workspace.yaml
├── apps/
│   └── demo/                          ← Next.js 14 app de demo unificada
│       ├── app/
│       │   ├── page.tsx               ← demo principal con avatar Simli
│       │   └── api/
│       │       ├── agent/route.ts     ← agentic loop servidor (tool use)
│       │       ├── brain/route.ts     ← fallback: Claude streaming directo
│       │       ├── voice/route.ts     ← ElevenLabs TTS WebSocket
│       │       └── token/route.ts     ← Simli session token (server-side)
│       ├── data/
│       │   └── business.example.json  ← config ejemplo "TechZone Perú"
│       ├── .env.local                 ← API keys locales
│       └── next.config.mjs            ← transpilePackages config
└── packages/
    ├── business-data/                 ← @agent-forge/business-data ✅
    │   ├── src/
    │   │   ├── index.ts               ← tipos + buildSystemPrompt()
    │   │   └── tools.ts               ← createBusinessTools()
    │   └── package.json
    ├── tools/                         ← @agent-forge/tools ✅
    │   ├── src/
    │   │   └── index.ts               ← useAgent() hook
    │   └── package.json
    ├── avatar/                        ← @agent-forge/avatar (next)
    ├── voice-out/                     ← @agent-forge/voice-out (next)
    ├── voice-in/                      ← @agent-forge/voice-in (next)
    └── ui-shell/                      ← @agent-forge/ui-shell (next)
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

### FASE 1 — Avatar Simli + Voice (COMPLETADO ✅)
- [x] Estructura de carpetas + pnpm workspaces
- [x] CLAUDE.md inicial con arquitectura
- [x] `apps/demo/page.tsx` — demo con avatar Simli streaming
- [x] `apps/demo/app/api/voice/route.ts` — ElevenLabs TTS WebSocket PCM16
- [x] `apps/demo/app/api/token/route.ts` — Simli session token generator
- [x] README.md con documentación completa
- [x] GitHub push público

### FASE 2 — Agentic Loop + Business Data (COMPLETADO ✅)
- [x] `packages/business-data` — tipos + buildSystemPrompt + createBusinessTools
- [x] `packages/tools` — useAgent hook con SSE + tool event tracking
- [x] `apps/demo/app/api/agent/route.ts` — agentic loop servidor (max 8 iteraciones)
- [x] `apps/demo/data/business.example.json` — config "TechZone Perú"
- [x] Configurar next.config.mjs con transpilePackages
- [x] GitHub actualizado con nuevos módulos

### FASE 3 — Módulos Adicionales (PENDIENTE)
- [ ] `packages/avatar` — componente HeyGen Streaming alternativo
- [ ] `packages/voice-out` — hook ElevenLabs (exportable)
- [ ] `packages/voice-in` — hook Web Speech API
- [ ] `packages/ui-shell` — layout futurista reutilizable
- [ ] `packages/doc-qa` — Q&A sobre documentos (fase 2)
- [ ] Deploy demo en Firebase Hosting
- [ ] npm publish (remover `private: true`, add tsup build)

---

## Guía rápida — Integrar en otro proyecto

### Caso 1: Agente con herramientas para tu negocio
```bash
# 1. Copiar módulos a tu proyecto
cp -r agent-forge/packages/business-data your-project/
cp -r agent-forge/packages/tools your-project/

# 2. Crear config JSON (o usar business.example.json como template)
cp agent-forge/apps/demo/data/business.example.json your-project/data/mi-negocio.json

# 3. Copiar API route
cp agent-forge/apps/demo/app/api/agent/route.ts your-project/app/api/

# 4. En tu página React:
import { useAgent } from '@agent-forge/tools'
import { buildSystemPrompt } from '@agent-forge/business-data'
import businessData from './data/mi-negocio.json'

export function MyAgent() {
  const { ask, messages, activeToolName } = useAgent({
    systemPrompt: buildSystemPrompt(businessData),
    businessConfig: businessData,
  })
  
  return (
    <div>
      <input onEnter={(e) => ask(e.currentTarget.value)} />
      {activeToolName && <p>Usando: {activeToolName}</p>}
      {messages.map(m => <div key={m.id}>{m.content}</div>)}
    </div>
  )
}
```

### Caso 2: Avatar Simli + Agente
```bash
# Adicional a lo anterior:
# 1. Configurar .env.local (ver sección Credenciales)
# 2. Copiar page.tsx de demo como base
cp agent-forge/apps/demo/app/page.tsx your-project/

# 3. Conectar avatar a useAgent hook (ver demos/app/page.tsx)
```

### Caso 3: Publicar módulo en npm
```bash
cd packages/business-data  # o /tools

# 1. Remover private: true en package.json
# 2. Agregar build script y tsup
npm install -D tsup
npm run build

# 3. Publicar
npm publish --access public
```

---

## Decisiones pendientes

1. **Face ID Simli** — subir foto a `app.simli.com` y guardar UUID en .env
2. **Voz Freddy en ElevenLabs** — Instant Voice Clone (subir ~1 min de audio) vs preset
3. **npm publish** — remover `private: true`, agregar tsup build, subir paquetes
4. **Firebase Hosting deploy** — para demo pública
