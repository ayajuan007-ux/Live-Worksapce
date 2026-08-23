import type { Project } from '../types'
import { seedProjects } from '../data/seed'

const KEY = 'jarvis-field-v1'

export function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seedProjects
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return seedProjects
    const clean = parsed.filter((item): item is Project => {
      const p = item as Project
      return typeof p?.id === 'string' && typeof p?.name === 'string' && Array.isArray(p?.phases)
    })
    return clean.length > 0 ? clean : seedProjects
  } catch {
    return seedProjects
  }
}

export function saveProjects(projects: Project[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(projects))
  } catch {
    /* almacenamiento no disponible */
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* almacenamiento no disponible */
  }
}
