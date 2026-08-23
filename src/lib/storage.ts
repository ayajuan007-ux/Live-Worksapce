import type { Connection, Project, Workspace } from '../types'

const KEY = 'live-workspace-v2'

export function loadWorkspace(): Workspace {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { projects: [], connections: [] }
    const parsed: unknown = JSON.parse(raw)
    const obj = parsed as Partial<Workspace>
    if (!Array.isArray(obj?.projects)) return { projects: [], connections: [] }
    const projects = obj.projects.filter((item): item is Project => {
      const p = item as Project
      return typeof p?.id === 'string' && typeof p?.name === 'string' && Array.isArray(p?.phases)
    })
    const connections = Array.isArray(obj.connections)
      ? obj.connections.filter((c): c is Connection => typeof c?.a === 'string' && typeof c?.b === 'string')
      : []
    return { projects, connections }
  } catch {
    return { projects: [], connections: [] }
  }
}

export function saveWorkspace(workspace: Workspace): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(workspace))
  } catch {
    /* almacenamiento no disponible */
  }
}

export function clearWorkspace(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* almacenamiento no disponible */
  }
}
