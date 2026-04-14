import { NextRequest } from 'next/server'

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID!
const API_KEY  = process.env.ELEVENLABS_API_KEY!

// Igual que nexus-p: limpia markdown antes de pasar a TTS
function cleanForTTS(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/[-•*+]\s+/g, '')
    .replace(/\d+\.\s+/g, '')
    .replace(/<br\/?>/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')   // todos los emojis fuera del BMP
    .replace(/[\u2600-\u27BF]/gu, '')          // emojis dentro del BMP
    .replace(/[\uD800-\uDFFF]/g, '')           // surrogates huérfanos (por si acaso)
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export async function POST(req: NextRequest) {
  const { text } = await req.json()
  if (!text?.trim()) return new Response('text requerido', { status: 400 })

  const clean = cleanForTTS(text).slice(0, 1200)

  // PCM16 16kHz mono — formato requerido por Simli
  // eleven_flash_v2_5: ultra low latency (de nexus-p)
  // similarity_boost 0.95 + style 0.4: config que mejor suena para Freddy
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
    {
      method: 'POST',
      headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: clean,
        model_id: 'eleven_flash_v2_5',
        // Sin output_format → MP3 por defecto (igual que nexus-p, que funciona)
        voice_settings: { stability: 0.6, similarity_boost: 0.95, style: 0.4, use_speaker_boost: true },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    return new Response(err, { status: res.status })
  }

  return new Response(res.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-cache',
    },
  })
}
