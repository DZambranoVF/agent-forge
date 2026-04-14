# AgentForge — Realtime AI Avatar Agent

A plug-and-play module for building real-time conversational AI agents with a lip-synced avatar, powered by Simli, ElevenLabs, and Claude.

> Built for the **Hackathon Reto Jueves** — April 2026

---

## Demo

Ask a question → Claude responds → ElevenLabs speaks → Simli avatar lip-syncs in real time.

```
User types/speaks
      ↓
 Claude API  (streaming text)
      ↓
 ElevenLabs TTS  (MP3 audio)
      ↓
 Simli WebRTC  (lip-synced avatar video)  <300ms latency
```

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 + TypeScript + Tailwind CSS |
| Avatar | [Simli](https://simli.ai) — WebRTC lip-sync from custom photo |
| Voice | [ElevenLabs](https://elevenlabs.io) — `eleven_flash_v2_5` ultra-low latency TTS |
| Brain | [Claude](https://anthropic.com) — `claude-sonnet-4-6` streaming |
| Monorepo | pnpm workspaces |

---

## Architecture

### Audio pipeline (no interference)

The key challenge is playing audio for the user **and** animating the avatar's mouth simultaneously without audio conflicts:

```
ElevenLabs returns MP3
      ↓
Collect all MP3 bytes on client
      ├─→ Blob URL → <audio> element  (user hears the voice)
      └─→ AudioContext.decodeAudioData()
              ↓
          Resample to PCM16 16kHz mono (nearest-neighbor)
              ↓
          simliClient.sendAudioData() in 6000-byte chunks  (mouth animation)
```

- Simli receives a **ghost audio element** (`volume = 0`) so the SDK can manage its internal state without producing any sound output.
- The `<audio>` element for playback is **pre-unlocked** inside the user gesture handler (before any `await`) to satisfy Chrome autoplay policy.

### Components

| File | Purpose |
|------|---------|
| `components/AgentAvatar.tsx` | Simli WebRTC avatar — connects, animates, exposes `sendAudio()` |
| `components/AgentShell.tsx` | UI shell — chat history, input, status badge |
| `app/page.tsx` | Orchestrator — wires brain → voice → avatar |
| `app/api/brain/route.ts` | Claude streaming API (server-side) |
| `app/api/voice/route.ts` | ElevenLabs TTS proxy (server-side) |
| `app/api/simli-token/route.ts` | Simli session token (server-side, never exposed to client) |

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/DZambranoVF/agent-forge.git
cd agent-forge
pnpm install
```

### 2. Environment variables

Create `apps/demo/.env.local`:

```env
# Claude
ANTHROPIC_API_KEY=sk-ant-...

# ElevenLabs
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=<your_voice_id>

# Simli
SIMLI_API_KEY=<your_simli_api_key>
NEXT_PUBLIC_SIMLI_API_KEY=<same_key>   # needed client-side for ICE servers
NEXT_PUBLIC_SIMLI_FACE_ID=<your_face_uuid>
```

#### Getting credentials

| Service | Where to get it |
|---------|----------------|
| Anthropic | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| ElevenLabs | [elevenlabs.io](https://elevenlabs.io) → Profile → API Keys. Voice ID from Voices page |
| Simli | [app.simli.com](https://app.simli.com) → API Keys. Upload a photo → get `faceId` UUID |

> **Tip:** For the cleanest voice quality use `eleven_flash_v2_5` with `stability: 0.6`, `similarity_boost: 0.95`, `style: 0.4`.

### 3. Run locally

```bash
pnpm --filter demo dev
# → http://localhost:3000
```

---

## Avatar States

The `<AgentAvatar>` component reflects conversation state with a colored ring:

| State | Ring color | Meaning |
|-------|-----------|---------|
| `idle` | Gray | Waiting for input |
| `listening` | Blue (pulse) | User is typing/speaking |
| `thinking` | Yellow | Waiting for Claude response |
| `talking` | Green (pulse) | Avatar is speaking |
| `error` | Red | Connection failed |

On connection failure a **Retry** button appears — no page reload needed.

---

## Key Implementation Notes

### Simli connection
- Token generation (`generateSimliSessionToken`) and ICE server fetch happen in **parallel** for fastest startup.
- `simli.start()` is called **without `await`** — this prevents the React cleanup from cancelling the WebSocket handshake mid-flight.
- Unhandled `PromiseRejectionEvent`s from LiveKit internals are suppressed on `window` to keep the Next.js error overlay clean.

### ElevenLabs → Simli sync
- `output_format: 'pcm_16000'` is intentionally **not used** — it causes audio artifacts (static). MP3 (default) sounds clean and is decoded client-side.
- PCM16 resampling uses nearest-neighbor (simple, fast, good enough for mouth sync).
- Simli expects chunks of ~6000 bytes — larger chunks cause visible mouth-animation lag.

---

## Monorepo structure

```
agent-forge/
├── apps/
│   └── demo/          ← Next.js 14 demo app
│       ├── app/
│       │   ├── page.tsx
│       │   └── api/
│       │       ├── brain/
│       │       ├── voice/
│       │       └── simli-token/
│       └── components/
│           ├── AgentAvatar.tsx
│           └── AgentShell.tsx
└── packages/          ← extractable modules (future)
    ├── avatar/
    ├── voice-out/
    ├── brain/
    └── voice-in/
```

---

## License

MIT
