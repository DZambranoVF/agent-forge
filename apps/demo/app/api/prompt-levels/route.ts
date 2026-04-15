import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import {
  buildBasicPrompt,
  buildMediumPrompt,
  buildAdvancedPrompt,
  LEVEL_META,
} from '@agent-forge/prompt-levels'
import type { PromptLevelResult, PromptLevelResults } from '@agent-forge/prompt-levels'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = 'claude-haiku-4-5-20251001' // Haiku: rápido y barato para 3 llamadas paralelas

async function callClaude(prompt: string): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })
  const block = response.content.find(b => b.type === 'text')
  return block?.type === 'text' ? block.text : ''
}

export async function POST(req: NextRequest) {
  const { task } = await req.json() as { task: string }

  if (!task?.trim()) {
    return NextResponse.json({ error: 'task requerido' }, { status: 400 })
  }

  const basicPrompt    = buildBasicPrompt(task)
  const mediumPrompt   = buildMediumPrompt(task)
  const advancedPrompt = buildAdvancedPrompt(task)

  // Llamar los 3 en paralelo
  const [basicText, mediumText, advancedText] = await Promise.all([
    callClaude(basicPrompt),
    callClaude(mediumPrompt),
    callClaude(advancedPrompt),
  ])

  const results: PromptLevelResults = {
    task,
    basic: {
      level:    'basic',
      prompt:   basicPrompt,
      response: basicText,
      meta:     LEVEL_META.basic,
    } as PromptLevelResult,
    medium: {
      level:    'medium',
      prompt:   mediumPrompt,
      response: mediumText,
      meta:     LEVEL_META.medium,
    } as PromptLevelResult,
    advanced: {
      level:    'advanced',
      prompt:   advancedPrompt,
      response: advancedText,
      meta:     LEVEL_META.advanced,
    } as PromptLevelResult,
  }

  return NextResponse.json(results)
}
