import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, LocateFixed, Menu, Plus, Search } from 'lucide-react'
import type { Project, Status } from './types'
import { NODE_COLORS, STATUSES } from './types'
import { seedProjects } from './data/seed'
import { clearStorage, loadProjects, saveProjects } from './lib/storage'
import { Scene, type FocusRequest } from './three/Scene'
import { TopBar } from './components/TopBar'
import { Dashboard } from './components/Dashboard'
import { CreateProjectModal } from './components/CreateProjectModal'
import './App.css'

const FOCUS_NEAR = 4.4
const FOCUS_HOME = 8.5

export default function App() {
  const [projects, setProjects] = useState<Project[]>(() => loadProjects())
  const [selectedId, setSelectedId] = useState('')
  const [dashboardOpen, setDashboardOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [focusToken, setFocusToken] = useState(0)
  const [focusPos, setFocusPos] = useState<[number, number, number]>([0, 0.3, 0])

  useEffect(() => saveProjects(projects), [projects])

  const activeId = projects.some((project) => project.id === selectedId) ? selectedId : ''
  const selected = projects.find((project) => project.id === activeId)

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return projects
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        project.code.toLowerCase().includes(query) ||
        (project.company ?? '').toLowerCase().includes(query),
    )
  }, [projects, search])

  const focus: FocusRequest = useMemo(() => ({ position: focusPos, distance: FOCUS_NEAR, token: focusToken }), [focusPos, focusToken])

  const requestFocus = useCallback((position: [number, number, number], distance = FOCUS_NEAR) => {
    setFocusPos(position)
    setFocusToken((token) => token + 1)
    void distance
  }, [])

  const select = useCallback(
    (id: string) => {
      setSelectedId(id)
      if (!id) return
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIndex + 1)
        if (trimmed[trimmed.length - 1] === id) return trimmed
        const next = [...trimmed, id]
        setHistoryIndex(next.length - 1)
        return next
      })
      const target = projects.find((project) => project.id === id)
      if (target) requestFocus(target.position)
    },
    [historyIndex, projects, requestFocus],
  )

  const goBack = useCallback(() => {
    if (historyIndex <= 0) return
    const index = historyIndex - 1
    setHistoryIndex(index)
    setSelectedId(history[index])
    const target = projects.find((project) => project.id === history[index])
    if (target) requestFocus(target.position)
  }, [history, historyIndex, projects, requestFocus])

  const goForward = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    const index = historyIndex + 1
    setHistoryIndex(index)
    setSelectedId(history[index])
    const target = projects.find((project) => project.id === history[index])
    if (target) requestFocus(target.position)
  }, [history, historyIndex, projects, requestFocus])

  const centerView = () => requestFocus([0, 0.2, 0], FOCUS_HOME)

  const move = useCallback((id: string, position: [number, number, number]) => {
    setProjects((items) => items.map((item) => (item.id === id ? { ...item, position } : item)))
  }, [])

  const removeProject = useCallback((id: string) => {
    setProjects((items) => items.filter((item) => item.id !== id))
  }, [])

  const cycleColor = useCallback((id: string) => {
    setProjects((items) =>
      items.map((item) => {
        if (item.id !== id) return item
        const index = NODE_COLORS.indexOf(item.color as (typeof NODE_COLORS)[number])
        const color = NODE_COLORS[(index + 1) % NODE_COLORS.length]
        return { ...item, color }
      }),
    )
  }, [])

  const adjustProgress = useCallback((id: string, delta: number) => {
    setProjects((items) =>
      items.map((item) =>
        item.id === id ? { ...item, progress: Math.max(0, Math.min(100, item.progress + delta)) } : item,
      ),
    )
  }, [])

  const cycleStatus = useCallback((id: string) => {
    setProjects((items) =>
      items.map((item) => {
        if (item.id !== id) return item
        const index = STATUSES.indexOf(item.status)
        const status = STATUSES[(index + 1) % STATUSES.length] as Status
        return { ...item, status, progress: status === 'Completado' ? 100 : item.progress }
      }),
    )
  }, [])

  const createProject = (project: Project) => {
    setProjects((items) => [...items, project])
    setModalOpen(false)
    select(project.id)
  }

  const resetData = () => {
    clearStorage()
    setProjects(seedProjects)
    select(seedProjects[0].id)
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'jarvis-field-respaldo.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const importData = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result))
        if (!Array.isArray(parsed)) return
        const valid = parsed.filter((item): item is Project => {
          const p = item as Project
          return typeof p?.id === 'string' && typeof p?.name === 'string' && Array.isArray(p?.phases)
        })
        if (valid.length > 0) setProjects(valid)
      } catch {
        /* archivo inválido: se ignora */
      }
    }
    reader.readAsText(file)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.tagName === 'INPUT') return
      if (event.key === 'Escape') setSelectedId('')
      if (event.key === '[') goBack()
      if (event.key === ']') goForward()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goBack, goForward])

  return (
    <main className="app-root">
      <div className="scene-layer">
        <Scene
          projects={visible}
          selectedId={activeId}
          onSelect={select}
          onMove={move}
          onDelete={removeProject}
          onCycleColor={cycleColor}
          onAdjustProgress={adjustProgress}
          onCycleStatus={cycleStatus}
          focus={focus}
        />
      </div>

      <div className="ui-overlay">
        <TopBar nodeCount={visible.length} />

        <button className={`dash-tab ${dashboardOpen ? 'shifted' : ''}`} onClick={() => setDashboardOpen((value) => !value)} aria-label="Alternar dashboard">
          <ArrowRight size={16} className={dashboardOpen ? 'flip' : ''} />
        </button>

        <Dashboard
          open={dashboardOpen}
          onClose={() => setDashboardOpen(false)}
          projects={projects}
          selectedId={activeId}
          onSelect={select}
          onResetData={resetData}
          onExport={exportData}
          onImport={importData}
        />

        <div className="dock">
          <label className="dock-search">
            <Search size={14} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nodo…" />
          </label>
          <button className="control-button primary" onClick={() => setModalOpen(true)}><Plus size={15} /> Nuevo</button>
          <button className="control-button" onClick={() => setDashboardOpen(true)}><Menu size={15} /> Dashboard</button>
          <button className="control-button icon-only" onClick={centerView} aria-label="Centrar cámara"><LocateFixed size={15} /></button>
          <button className="control-button icon-only" onClick={goBack} disabled={historyIndex <= 0} aria-label="Ir atrás"><ArrowLeft size={15} /></button>
          <button className="control-button icon-only" onClick={goForward} disabled={historyIndex >= history.length - 1} aria-label="Ir adelante"><ArrowRight size={15} /></button>
        </div>

        <footer className="hint-bar">ARRASTRA NODOS · RUEDA = ZOOM INFINITO · CLIC FUERA CIERRA LA FICHA · ESC LIMPIA SELECCIÓN</footer>
      </div>

      {modalOpen && <CreateProjectModal onClose={() => setModalOpen(false)} onCreate={createProject} />}

      {selected && (
        <div className="selection-strip" style={{ '--c': selected.color } as React.CSSProperties}>
          <i /> {selected.name} · {selected.code}
        </div>
      )}
    </main>
  )
}
