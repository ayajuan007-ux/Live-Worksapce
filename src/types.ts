export type Kind = 'empresarial' | 'personal'
export type Status = 'En curso' | 'Planificacion' | 'Completado'
export type PhaseStatus = 'Listo' | 'Activo' | 'Proximo'

export type Phase = { id: string; name: string; owner?: string; progress: number; status: PhaseStatus; date: string }
export type FollowUp = { id: string; note: string; date: string }
export type Contact = { name?: string; email?: string; phone?: string }
export type DocumentRef = { name: string; type: string; pages?: number }

export type Project = {
  id: string
  kind: Kind
  name: string
  code: string
  status: Status
  progress: number
  delivery: string
  position: [number, number, number]
  color: string
  summary: string
  company?: string
  niche?: string
  value?: string
  contact?: Contact
  agreements?: string[]
  ideas?: string[]
  document?: DocumentRef
  phases: Phase[]
  followUps: FollowUp[]
}

export const NODE_COLORS = ['#d8ff63', '#ff8164', '#7eb7ff', '#bc8cff', '#ffd166', '#62f5d0', '#ff6bd6'] as const

export const STATUSES: Status[] = ['En curso', 'Planificacion', 'Completado']
