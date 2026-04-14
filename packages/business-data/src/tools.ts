/**
 * Server-side only — usa esto en Next.js API routes, no en componentes React.
 * Genera las herramientas de Claude a partir de la BusinessConfig.
 */
import type { BusinessConfig, PQRResult } from './types'

export interface ServerTool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
  execute: (input: Record<string, unknown>) => unknown
}

export function createBusinessTools(config: BusinessConfig): ServerTool[] {
  const tools: ServerTool[] = []

  // ─── Productos ────────────────────────────────────────────────────────────
  if (config.products && config.products.length > 0) {
    tools.push({
      name: 'buscar_productos',
      description: 'Busca productos del catálogo por nombre, categoría, características o precio máximo.',
      input_schema: {
        type: 'object',
        properties: {
          query:     { type: 'string',  description: 'Texto libre de búsqueda (nombre, característica, uso)' },
          category:  { type: 'string',  description: 'Filtrar por categoría exacta (opcional)' },
          max_price: { type: 'number',  description: 'Precio máximo en la moneda del negocio (opcional)' },
        },
        required: ['query'],
      },
      execute: ({ query, category, max_price }) => {
        let items = config.products!.filter(p => p.available !== false)
        const q = String(query).toLowerCase()

        items = items.filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.features?.some(f => f.toLowerCase().includes(q))
        )

        if (category) {
          items = items.filter(p => p.category.toLowerCase() === String(category).toLowerCase())
        }
        if (max_price !== undefined) {
          items = items.filter(p => p.price <= Number(max_price))
        }

        if (items.length === 0) return 'No se encontraron productos con esos criterios.'

        return items.slice(0, 6).map(p => {
          const currency = p.currency ?? 'USD'
          const feats = p.features?.length ? `\n  Características: ${p.features.join(', ')}` : ''
          const avail = p.available === false ? '\n  [No disponible]' : ''
          return `**${p.name}** — ${currency} ${p.price}\n  ${p.description}${feats}${avail}`
        }).join('\n\n')
      },
    })
  }

  // ─── Servicios ────────────────────────────────────────────────────────────
  if (config.services && config.services.length > 0) {
    tools.push({
      name: 'buscar_servicios',
      description: 'Busca servicios disponibles por nombre, descripción o categoría.',
      input_schema: {
        type: 'object',
        properties: {
          query:    { type: 'string', description: 'Texto libre de búsqueda' },
          category: { type: 'string', description: 'Filtrar por categoría (opcional)' },
        },
        required: ['query'],
      },
      execute: ({ query, category }) => {
        let items = config.services!.filter(s => s.available !== false)
        const q = String(query).toLowerCase()

        items = items.filter(s =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          (s.category?.toLowerCase().includes(q) ?? false)
        )

        if (category) {
          items = items.filter(s => s.category?.toLowerCase() === String(category).toLowerCase())
        }

        if (items.length === 0) return 'No se encontraron servicios con esos criterios.'

        return items.slice(0, 6).map(s => {
          const price  = s.price ? ` — ${s.currency ?? 'USD'} ${s.price}` : ''
          const dur    = s.duration ? ` (${s.duration})` : ''
          const appt   = s.requiresAppointment ? '\n  Requiere cita previa.' : ''
          return `**${s.name}**${price}${dur}\n  ${s.description}${appt}`
        }).join('\n\n')
      },
    })
  }

  // ─── Horarios ─────────────────────────────────────────────────────────────
  tools.push({
    name: 'consultar_horarios',
    description: 'Consulta los horarios de atención del negocio.',
    input_schema: {
      type: 'object',
      properties: {
        day: { type: 'string', description: 'Día específico a consultar (opcional, ej: "Sábado")' },
      },
    },
    execute: ({ day }) => {
      const hours = config.hours
      if (!hours || Object.keys(hours).length === 0) return 'No hay información de horarios disponible.'

      if (day) {
        const d = String(day)
        const match = Object.entries(hours).find(([k]) =>
          k.toLowerCase().includes(d.toLowerCase())
        )
        if (match) return `${match[0]}: ${match[1]}`
        return `No se encontró horario para "${d}". Horarios disponibles:\n` +
          Object.entries(hours).map(([k, v]) => `- ${k}: ${v}`).join('\n')
      }

      return Object.entries(hours).map(([k, v]) => `- ${k}: ${v}`).join('\n')
    },
  })

  // ─── FAQ ──────────────────────────────────────────────────────────────────
  if (config.faqs && config.faqs.length > 0) {
    tools.push({
      name: 'buscar_faq',
      description: 'Busca respuestas a preguntas frecuentes sobre el negocio, productos o servicios.',
      input_schema: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'La pregunta del cliente' },
        },
        required: ['question'],
      },
      execute: ({ question }) => {
        const q = String(question).toLowerCase()
        const matches = config.faqs!.filter(f =>
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q) ||
          q.split(' ').some(word => word.length > 3 && f.question.toLowerCase().includes(word))
        )

        if (matches.length === 0) return 'No se encontró una respuesta en las FAQs para esa pregunta.'

        return matches.slice(0, 3).map(f =>
          `**P: ${f.question}**\nR: ${f.answer}`
        ).join('\n\n')
      },
    })
  }

  // ─── Promociones ──────────────────────────────────────────────────────────
  if (config.promotions && config.promotions.length > 0) {
    tools.push({
      name: 'consultar_promociones',
      description: 'Consulta las promociones, descuentos y ofertas vigentes.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Buscar promoción específica (opcional)' },
        },
      },
      execute: ({ query }) => {
        let promos = config.promotions!
        if (query) {
          const q = String(query).toLowerCase()
          promos = promos.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
          )
        }

        if (promos.length === 0) return 'No hay promociones vigentes en este momento.'

        return promos.map(p => {
          const discount = p.discount ? ` — ${p.discount}` : ''
          const until    = p.validUntil ? `\n  Válido hasta: ${p.validUntil}` : ''
          const cond     = p.conditions ? `\n  Condiciones: ${p.conditions}` : ''
          return `**${p.name}**${discount}\n  ${p.description}${until}${cond}`
        }).join('\n\n')
      },
    })
  }

  // ─── PQR ──────────────────────────────────────────────────────────────────
  tools.push({
    name: 'registrar_pqr',
    description: 'Registra una Petición, Queja, Reclamo o Sugerencia del cliente.',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['pregunta', 'queja', 'reclamo', 'sugerencia'],
          description: 'Tipo de PQR',
        },
        description: {
          type: 'string',
          description: 'Descripción detallada del caso',
        },
        customer_name: {
          type: 'string',
          description: 'Nombre del cliente (opcional)',
        },
        customer_email: {
          type: 'string',
          description: 'Email del cliente para seguimiento (opcional)',
        },
      },
      required: ['type', 'description'],
    },
    execute: ({ type, description, customer_name, customer_email }) => {
      const ticketId = `PQR-${Date.now().toString(36).toUpperCase()}`
      const result: PQRResult = {
        ticketId,
        type: type as PQRResult['type'],
        status: 'abierto',
        createdAt: new Date().toISOString(),
        message: `Tu ${type} ha sido registrada con el número **${ticketId}**. Nos pondremos en contacto contigo a la brevedad.${customer_email ? ` Recibirás una confirmación en ${customer_email}.` : ''}`,
      }
      // En producción aquí guardarías en DB. Por ahora retorna el ticket.
      return result.message
    },
  })

  // ─── Staff ────────────────────────────────────────────────────────────────
  if (config.staff && config.staff.length > 0) {
    tools.push({
      name: 'consultar_equipo',
      description: 'Consulta información sobre el equipo o staff del negocio.',
      input_schema: {
        type: 'object',
        properties: {
          specialty: { type: 'string', description: 'Buscar por especialidad o rol (opcional)' },
        },
      },
      execute: ({ specialty }) => {
        let staff = config.staff!.filter(s => s.available !== false)
        if (specialty) {
          const q = String(specialty).toLowerCase()
          staff = staff.filter(s =>
            s.role.toLowerCase().includes(q) ||
            s.specialties?.some(sp => sp.toLowerCase().includes(q))
          )
        }

        if (staff.length === 0) return 'No se encontraron miembros del equipo con ese criterio.'

        return staff.map(s => {
          const specs = s.specialties?.length ? `\n  Especialidades: ${s.specialties.join(', ')}` : ''
          return `**${s.name}** — ${s.role}${specs}`
        }).join('\n\n')
      },
    })
  }

  return tools
}
