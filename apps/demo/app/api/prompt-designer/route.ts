import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { TONE_DESCRIPTIONS } from '@agent-forge/prompt-designer'
import type { PromptDesignerInput, PromptDesignerResult, ConversationTurn } from '@agent-forge/prompt-designer'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL  = 'claude-haiku-4-5-20251001'

// ── Meta-prompt: Claude genera el system prompt ───────────────────────────────

function buildMetaPrompt(input: PromptDesignerInput): string {
  const toneDesc = TONE_DESCRIPTIONS[input.tone]
  const botName  = input.botName?.trim() || 'Asistente'

  return `Eres un experto en ingeniería de prompts con experiencia diseñando chatbots para empresas.

Tu tarea es crear un system prompt de alta calidad para un chatbot llamado "${botName}" basado en esta especificación:

ESPECIFICACIÓN:
- Propósito: ${input.purpose}
- Tono: ${input.tone} (${toneDesc})
- Restricciones (qué NO debe hacer): ${input.restrictions || 'ninguna especificada'}
- Formato de respuesta: ${input.responseFormat || 'respuestas claras y útiles'}
- Audiencia: ${input.audience || 'usuarios generales'}

GENERA un JSON con exactamente esta estructura (sin markdown, solo JSON puro):
{
  "systemPrompt": "el system prompt completo listo para usar en Claude API",
  "testConversation": [
    {"role": "user", "content": "mensaje de usuario"},
    {"role": "assistant", "content": "respuesta del bot usando el system prompt"},
    {"role": "user", "content": "segunda pregunta más específica"},
    {"role": "assistant", "content": "respuesta detallada del bot"},
    {"role": "user", "content": "pregunta que prueba una restricción o caso edge"},
    {"role": "assistant", "content": "respuesta manejando el caso correctamente"}
  ],
  "techniques": ["lista de técnicas de prompting usadas, máx 6"],
  "analysis": "análisis de 2-3 oraciones explicando por qué este prompt es efectivo"
}

REQUISITOS DEL SYSTEM PROMPT que debes generar:
1. Definir el rol del bot con nombre y descripción concreta
2. Especificar el tono con ejemplos de frases que debe y no debe usar
3. Listar restricciones como reglas explícitas y claras
4. Definir el formato de respuesta con longitud y estructura
5. Incluir 2 ejemplos few-shot de interacciones esperadas
6. Agregar instrucciones de manejo de casos edge (qué hacer cuando no sabe algo)

El system prompt debe estar en el mismo idioma que el propósito especificado.
Responde SOLO con el JSON, sin texto adicional.`
}

export async function POST(req: NextRequest) {
  const input = await req.json() as PromptDesignerInput

  if (!input.purpose?.trim()) {
    return NextResponse.json({ error: 'purpose requerido' }, { status: 400 })
  }

  const metaPrompt = buildMetaPrompt(input)

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2500,
    messages: [{ role: 'user', content: metaPrompt }],
  })

  const block = response.content.find(b => b.type === 'text')
  const raw   = block?.type === 'text' ? block.text.trim() : '{}'

  let parsed: PromptDesignerResult

  try {
    // Extraer JSON aunque Claude agregue texto extra
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch?.[0] ?? '{}')
  } catch {
    return NextResponse.json({ error: 'Error parseando respuesta de Claude', raw }, { status: 500 })
  }

  // Validar estructura mínima
  if (!parsed.systemPrompt || !Array.isArray(parsed.testConversation)) {
    return NextResponse.json({ error: 'Respuesta incompleta de Claude', raw }, { status: 500 })
  }

  return NextResponse.json(parsed satisfies PromptDesignerResult)
}
