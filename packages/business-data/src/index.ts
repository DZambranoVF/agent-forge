export type {
  BusinessConfig,
  Product,
  Service,
  FAQ,
  Promotion,
  BusinessHours,
  BusinessPolicies,
  StaffMember,
  BusinessContact,
  PQRResult,
} from './types'

import type { BusinessConfig } from './types'

/**
 * Genera el system prompt base para el agente a partir de la config del negocio.
 * Se usa tanto en el cliente (para preview) como en el servidor (para el API route).
 */
export function buildSystemPrompt(config: BusinessConfig): string {
  const personality = config.agentPersonality
    ? config.agentPersonality.replace('{name}', config.name)
    : `Eres un asistente virtual amable y profesional de ${config.name}. Responde siempre en español, de forma concisa y natural. Máximo 3 oraciones por respuesta.`

  const lines: string[] = [
    personality,
    '',
    `## Negocio: ${config.name}`,
    config.description,
  ]

  if (config.industry) lines.push(`Industria: ${config.industry}`)

  if (config.contact) {
    lines.push('', '## Contacto')
    const c = config.contact
    if (c.phone)     lines.push(`- Teléfono: ${c.phone}`)
    if (c.whatsapp)  lines.push(`- WhatsApp: ${c.whatsapp}`)
    if (c.email)     lines.push(`- Email: ${c.email}`)
    if (c.website)   lines.push(`- Web: ${c.website}`)
    if (c.address)   lines.push(`- Dirección: ${c.address}${c.city ? ', ' + c.city : ''}`)
    if (c.googleMaps) lines.push(`- Maps: ${c.googleMaps}`)
  }

  if (config.hours) {
    lines.push('', '## Horarios de atención')
    Object.entries(config.hours).forEach(([day, hours]) => {
      lines.push(`- ${day}: ${hours}`)
    })
  }

  if (config.policies) {
    lines.push('', '## Políticas')
    Object.entries(config.policies).forEach(([key, value]) => {
      if (value) lines.push(`- ${key}: ${value}`)
    })
  }

  lines.push(
    '',
    '## Instrucciones',
    '- Usa las herramientas disponibles para buscar productos, servicios, FAQs y registrar PQRs.',
    '- Si no encuentras información con las herramientas, dilo claramente.',
    '- Nunca inventes precios, características o disponibilidad.',
    '- Si el cliente quiere registrar una queja o reclamo, usa la herramienta registrar_pqr.',
  )

  return lines.join('\n')
}
