export interface Product {
  id: string
  name: string
  description: string
  price: number
  currency?: string        // default: 'USD'
  category: string
  features?: string[]
  available?: boolean
  sku?: string
  imageUrl?: string
}

export interface Service {
  id: string
  name: string
  description: string
  price?: number
  currency?: string
  duration?: string        // '30 min', '1 hora'
  category?: string
  available?: boolean
  requiresAppointment?: boolean
}

export interface FAQ {
  question: string
  answer: string
  category?: string
}

export interface Promotion {
  name: string
  description: string
  discount?: string        // '20%', '$10 off'
  validUntil?: string
  conditions?: string
  applicableTo?: string[]  // product/service IDs
}

export interface BusinessHours {
  [day: string]: string   // 'Lunes': '8:00 - 18:00', 'Domingo': 'Cerrado'
}

export interface BusinessPolicies {
  returns?: string
  shipping?: string
  payment?: string
  warranty?: string
  [key: string]: string | undefined
}

export interface StaffMember {
  name: string
  role: string
  specialties?: string[]
  available?: boolean
}

export interface BusinessContact {
  phone?: string
  email?: string
  website?: string
  whatsapp?: string
  address?: string
  city?: string
  country?: string
  googleMaps?: string
}

export interface BusinessConfig {
  /** Nombre del negocio */
  name: string
  /** Descripción breve — qué hace, a quién sirve */
  description: string
  industry?: string
  contact: BusinessContact
  hours: BusinessHours
  products?: Product[]
  services?: Service[]
  faqs?: FAQ[]
  promotions?: Promotion[]
  policies?: BusinessPolicies
  staff?: StaffMember[]
  /**
   * Personalidad del agente.
   * Ejemplo: "Eres María, asesora de ventas amable de {name}. Responde en español,
   * máximo 3 oraciones, siempre ofrece ayuda adicional."
   * Usa {name} como placeholder para el nombre del negocio.
   */
  agentPersonality?: string
}

/** Resultado de un PQR registrado */
export interface PQRResult {
  ticketId: string
  type: 'pregunta' | 'queja' | 'reclamo' | 'sugerencia'
  status: 'abierto'
  createdAt: string
  message: string
}
