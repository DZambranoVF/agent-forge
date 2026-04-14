import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { createBusinessTools } from '@agent-forge/business-data/tools'
import type { BusinessConfig } from '@agent-forge/business-data'
import type { ServerTool } from '@agent-forge/business-data/tools'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MAX_TOOL_ITERATIONS = 8

interface IncomingMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  const { messages, systemPrompt, businessConfig } = await req.json() as {
    messages: IncomingMessage[]
    systemPrompt: string
    businessConfig: BusinessConfig | null
  }

  const tools: ServerTool[] = businessConfig
    ? createBusinessTools(businessConfig)
    : []

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (line: string) =>
        controller.enqueue(encoder.encode(`data: ${line}\n\n`))

      try {
        // Convertir mensajes al formato Anthropic
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anthropicMessages: any[] = messages.map(m => ({
          role: m.role,
          content: m.content,
        }))

        let iterations = 0

        // ── Agentic loop ──────────────────────────────────────────────────
        while (iterations < MAX_TOOL_ITERATIONS) {
          iterations++

          const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            system: systemPrompt,
            messages: anthropicMessages,
            tools: tools.map(t => ({
              name:         t.name,
              description:  t.description,
              input_schema: t.input_schema,
            })),
          })

          // ── Claude terminó — streamear texto final ─────────────────────
          if (response.stop_reason === 'end_turn') {
            const textBlock = response.content.find(b => b.type === 'text')
            const text = textBlock?.type === 'text' ? textBlock.text : ''

            // Stream del texto carácter por carácter (SSE)
            const words = text.split('')
            let buffer = ''
            for (const char of words) {
              buffer += char
              if (buffer.length >= 4) {
                send(buffer)
                buffer = ''
              }
            }
            if (buffer) send(buffer)
            send('[DONE]')
            controller.close()
            return
          }

          // ── Claude quiere usar herramientas ────────────────────────────
          if (response.stop_reason === 'tool_use') {
            // Agregar respuesta del asistente al historial
            anthropicMessages.push({ role: 'assistant', content: response.content })

            // Ejecutar todas las herramientas pedidas
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const toolResults: any[] = []

            for (const block of response.content) {
              if (block.type !== 'tool_use') continue

              // Notificar al cliente qué herramienta se está usando
              send(`[TOOL:${block.name}]`)

              const tool = tools.find(t => t.name === block.name)
              let result: string

              if (!tool) {
                result = `Herramienta "${block.name}" no encontrada.`
              } else {
                try {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const raw = tool.execute(block.input as Record<string, unknown>)
                  result = typeof raw === 'string' ? raw : JSON.stringify(raw)
                } catch (e) {
                  result = `Error ejecutando ${block.name}: ${String(e)}`
                }
              }

              toolResults.push({
                type:        'tool_result',
                tool_use_id: block.id,
                content:     result,
              })
            }

            // Agregar resultados al historial y continuar el loop
            anthropicMessages.push({ role: 'user', content: toolResults })
            continue
          }

          // Caso inesperado — salir
          send('[DONE]')
          controller.close()
          return
        }

        // Si agotamos iteraciones, avisamos
        send('Lo siento, no pude completar la consulta en los pasos disponibles.')
        send('[DONE]')
        controller.close()

      } catch (err) {
        console.error('[agent] error:', err)
        send(`Error interno: ${String(err)}`)
        send('[DONE]')
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
