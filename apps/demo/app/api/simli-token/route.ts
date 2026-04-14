import { NextRequest } from 'next/server'

// El token de sesión Simli NUNCA se genera en el cliente
export async function POST(req: NextRequest) {
  const { faceId } = await req.json()

  const res = await fetch('https://api.simli.ai/startE2ESession', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.SIMLI_API_KEY!,
    },
    body: JSON.stringify({
      faceId: faceId || process.env.SIMLI_FACE_ID,
      voiceId: 'none',       // nosotros manejamos el audio con ElevenLabs
      systemPrompt: '',      // el brain lo manejamos con Claude
    }),
  })

  if (!res.ok) {
    return new Response('Error generando token Simli', { status: 500 })
  }

  const data = await res.json()
  return Response.json({ roomUrl: data.roomUrl })
}
