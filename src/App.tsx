import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Link2, LocateFixed, Menu, Plus, Search, Unlink2 } from 'lucide-react'
import { Analytics } from '@vercel/analytics/react'
import type { Connection, PanelKey, Project, Status, Vec3 } from './types'
import { NODE_COLORS, STATUSES } from './types'
import { clearWorkspace, loadWorkspace, saveWorkspace } from './lib/storage'
import { Scene, type FocusRequest } from './three/Scene'
import { TopBar } from './components/TopBar'
import { Dashboard } from './components/Dashboard'
import { CreateProjectModal } from './components/CreateProjectModal'
import { DetailModeCanvas } from './components/DetailMode'
import './App.css'

const FOCUS_NEAR = 4.4
const FOCUS_HOME = 8.5

export default function App() {
  const initial = useMemo(() => loadWorkspace(), [])
  const [projects, setProjects] = useState<Project[]>(initial.projects)
  const [connections, setConnections] = useState<Connection[]>(initial.connections)
  const [selectedId, setSelectedId] = useState('')
  const [dashboardOpen, setDashboardOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [focusToken, setFocusToken] = useState(0)
  const [focusPos, setFocusPos] = useState<Vec3>([0, 0.3, 0])
  const [linkMode, setLinkMode] = useState(false)
  const [linkFirstId, setLinkFirstId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState('')

  useEffect(() => saveWorkspace({ projects, connections }), [projects, connections])

  const activeId = projects.some((project) => project.id === selectedId) ? selectedId : ''
  const selected = projects.find((project) => project.id === activeId)
  const detailProject = projects.find((project) => project.id === detailId)

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

  const visibleIds = useMemo(() => new Set(visible.map((project) => project.id)), [visible])

  const focus: FocusRequest = useMemo(() => ({ position: focusPos, distance: FOCUS_NEAR, token: focusToken }), [focusPos, focusToken])

  const requestFocus = useCallback((position: Vec3, distance = FOCUS_NEAR) => {
    setFocusPos(position)
    setFocusToken((token) => token + 1)
    void distance
  }, [])

  const handleFieldClick = useCallback(
    (id: string) => {
      if (linkMode) {
        if (!linkFirstId) {
          setLinkFirstId(id)
          return
        }
        if (linkFirstId === id) {
          setLinkFirstId(null)
          return
        }
        const exists = connections.some((c) => (c.a === linkFirstId && c.b === id) || (c.a === id && c.b === linkFirstId))
        setConnections((items) =>
          exists ? items.filter((c) => !((c.a === linkFirstId && c.b === id) || (c.a === id && c.b === linkFirstId))) : [...items, { a: linkFirstId, b: id }],
        )
        setLinkFirstId(null)
        return
      }
      const target = projects.find((project) => project.id === id)
      if (!target) return
      setSelectedId(id)
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIndex + 1)
        if (trimmed[trimmed.length - 1] === id) return trimmed
        const next = [...trimmed, id]
        setHistoryIndex(next.length - 1)
        return next
      })
      requestFocus(target.position)
      setDetailId(id)
    },
    [connections, historyIndex, linkFirstId, linkMode, projects, requestFocus],
  )

  const goBack = useCallback(() => {
    if (historyIndex <= 0 || linkMode) return
    const index = historyIndex - 1
    setHistoryIndex(index)
    setSelectedId(history[index])
    const target = projects.find((project) => project.id === history[index])
    if (target) requestFocus(target.position)
  }, [history, historyIndex, linkMode, projects, requestFocus])

  const goForward = useCallback(() => {
    if (historyIndex >= history.length - 1 || linkMode) return
    const index = historyIndex + 1
    setHistoryIndex(index)
    setSelectedId(history[index])
    const target = projects.find((project) => project.id === history[index])
    if (target) requestFocus(target.position)
  }, [history, historyIndex, linkMode, projects, requestFocus])

  const centerView = () => requestFocus([0, 0.2, 0], FOCUS_HOME)

  const move = useCallback((id: string, position: Vec3) => {
    setProjects((items) => items.map((item) => (item.id === id ? { ...item, position } : item)))
  }, [])

  const removeProject = useCallback((id: string) => {
    setProjects((items) => items.filter((item) => item.id !== id))
    setConnections((items) => items.filter((connection) => connection.a !== id && connection.b !== id))
    setDetailId('')
  }, [])

  const cycleColor = useCallback((id: string) => {
    setProjects((items) =>
      items.map((item) => {
        if (item.id !== id) return item
        const index = NODE_COLORS.indexOf(item.color as (typeof NODE_COLORS)[number])
        return { ...item, color: NODE_COLORS[(index + 1) % NODE_COLORS.length] }
      }),
    )
  }, [])

  const adjustProgress = useCallback((id: string, delta: number) => {
    setProjects((items) =>
      items.map((item) => (item.id === id ? { ...item, progress: Math.max(0, Math.min(100, item.progress + delta)) } : item)),
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

  const commitOffsets = useCallback((id: string, key: PanelKey, offset: Vec3) => {
    setProjects((items) =>
      items.map((item) => (item.id === id ? { ...item, panelOffsets: { ...item.panelOffsets, [key]: offset } } : item)),
    )
  }, [])

  const createProject = (project: Project) => {
    setProjects((items) => [...items, project])
    setModalOpen(false)
    setSelectedId(project.id)
    setDetailId(project.id)
  }

  const toggleLinkMode = () => {
    setLinkMode((value) => !value)
    setLinkFirstId(null)
  }

  const resetData = () => {
    clearWorkspace()
    setProjects([])
    setConnections([])
    setSelectedId('')
    setDetailId('')
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ projects, connections }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'live-workspace-respaldo.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const importData = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<{ projects: Project[]; connections: Connection[] }>
        if (Array.isArray(parsed?.projects) && parsed.projects.length > 0) {
          setProjects(parsed.projects)
          setConnections(Array.isArray(parsed.connections) ? parsed.connections : [])
        }
      } catch {
        /* archivo inválido */
      }
    }
    reader.readAsText(file)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.tagName === 'INPUT') return
      if (event.key === 'Escape') {
        if (detailId) setDetailId('')
        else if (linkMode) toggleLinkMode()
        else setSelectedId('')
      }
      if (event.key === '[') goBack()
      if (event.key === ']') goForward()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detailId, goBack, goForward, linkMode])

  const detailProps = {
    onClose: () => setDetailId(''),
    onDelete: removeProject,
    onCycleColor: cycleColor,
    onAdjustProgress: adjustProgress,
    onCycleStatus: cycleStatus,
    onCommitOffsets: commitOffsets,
  }

  return (
    <main className="app-root">
      <div className="scene-layer">
        <Scene
          projects={visible}
          visibleIds={visibleIds}
          selectedId={activeId}
          connections={connections}
          linkFirstId={linkFirstId}
          onSelect={handleFieldClick}
          onMove={move}
          onDelete={removeProject}
          onCycleColor={cycleColor}
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
          onSelect={handleFieldClick}
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
          <button
            className={`control-button ${linkMode ? 'active' : ''}`}
            onClick={toggleLinkMode}
            disabled={projects.length < 2}
            title="Conectar o desconectar dos bolas"
          >
            {linkMode ? <Unlink2 size={15} /> : <Link2 size={15} />} Conectar
          </button>
          <button className="control-button" onClick={() => setDashboardOpen(true)}><Menu size={15} /> Dashboard</button>
          <button className="control-button icon-only" onClick={centerView} aria-label="Centrar cámara"><LocateFixed size={15} /></button>
          <button className="control-button icon-only" onClick={goBack} disabled={historyIndex <= 0} aria-label="Ir atrás"><ArrowLeft size={15} /></button>
          <button className="control-button icon-only" onClick={goForward} disabled={historyIndex >= history.length - 1} aria-label="Ir adelante"><ArrowRight size={15} /></button>
        </div>

        <footer className={`hint-bar ${linkMode ? 'hint-link' : ''}`}>
          {linkMode
            ? linkFirstId
              ? 'NODO ELEGIDO · CLIC EN OTRA BOLA PARA CONECTAR / DESCONECTAR'
              : 'MODO CONEXIÓN · CLIC EN LA PRIMERA BOLA'
            : 'CLIC EN UNA BOLA = ABRIR SU CAMPO · ARRASTRA NODOS · RUEDA = ZOOM INFINITO · ESC = VOLVER'}
        </footer>

        {projects.length === 0 && !modalOpen && (
          <div className="empty-wrap">
            <div className="empty-card">
              <span className="eyebrow">LIVE WORKSPACE</span>
              <h2>Campo vacío</h2>
              <p>Crea tu primer nodo para empezar a organizar tus proyectos en el espacio.</p>
              <button className="control-button primary big" onClick={() => setModalOpen(true)}><Plus size={16} /> Crear primer nodo</button>
            </div>
          </div>
        )}

        {selected && !detailId && (
          <div className="selection-strip" style={{ '--c': selected.color } as React.CSSProperties}>
            <i /> {selected.name} · {selected.code}
          </div>
        )}
      </div>

      {modalOpen && <CreateProjectModal onClose={() => setModalOpen(false)} onCreate={createProject} />}

      {detailProject && <DetailModeCanvas project={detailProject} {...detailProps} />}

      <Analytics />
    </main>
  )
}
