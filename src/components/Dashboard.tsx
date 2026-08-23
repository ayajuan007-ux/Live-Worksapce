import { useMemo, useRef, useState } from 'react'
import { Activity, Check, Download, LocateFixed, Upload, UserRound, X } from 'lucide-react'
import type { Project, Status } from '../types'

type DashboardProps = {
  open: boolean
  onClose: () => void
  projects: Project[]
  selectedId: string
  onSelect: (id: string) => void
  onResetData: () => void
  onExport: () => void
  onImport: (file: File) => void
}

const TABS = [
  { id: 'stats', label: 'Estadísticas', icon: Activity },
  { id: 'profile', label: 'Perfil', icon: UserRound },
  { id: 'follow', label: 'Seguimientos', icon: LocateFixed },
] as const

type TabId = (typeof TABS)[number]['id']

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  )
}

export function Dashboard({ open, onClose, projects, selectedId, onSelect, onResetData, onExport, onImport }: DashboardProps) {
  const [tab, setTab] = useState<TabId>('stats')
  const fileInput = useRef<HTMLInputElement>(null)

  const stats = useMemo(() => {
    const total = projects.length
    const byStatus: Record<Status, number> = { 'En curso': 0, Planificacion: 0, Completado: 0 }
    let progressSum = 0
    let docs = 0
    for (const project of projects) {
      byStatus[project.status] += 1
      progressSum += project.progress
      if (project.document) docs += 1
    }
    return { total, byStatus, avg: total ? Math.round(progressSum / total) : 0, docs }
  }, [projects])

  const followUps = useMemo(
    () =>
      projects.flatMap((project) =>
        project.followUps.map((follow) => ({ ...follow, projectName: project.name, color: project.color, projectId: project.id })),
      ),
    [projects],
  )

  const phases = useMemo(
    () => projects.flatMap((project) => project.phases.map((phase) => ({ ...phase, projectName: project.name, color: project.color, projectId: project.id }))),
    [projects],
  )

  return (
    <aside className={`dashboard ${open ? 'dashboard-open' : ''}`}>
      <div className="dash-head">
        <span className="eyebrow">JARVIS · CONTROL</span>
        <button className="icon-btn" onClick={onClose} aria-label="Cerrar dashboard"><X size={15} /></button>
      </div>

      <nav className="dash-tabs">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </nav>

      <div className="dash-content">
        {tab === 'stats' && (
          <>
            <div className="stat-grid">
              <StatCard label="NODOS" value={String(stats.total)} />
              <StatCard label="EN CURSO" value={String(stats.byStatus['En curso'])} />
              <StatCard label="COMPLETADOS" value={String(stats.byStatus['Completado'])} />
              <StatCard label="DOCS CARGADOS" value={String(stats.docs)} />
            </div>
            <div className="stat-card full">
              <span>PROGRESO PROMEDIO</span>
              <strong>{stats.avg}%</strong>
              <div className="bar"><i style={{ width: `${stats.avg}%` }} /></div>
            </div>
            <div className="status-bars">
              {(Object.keys(stats.byStatus) as Status[]).map((status) => (
                <div key={status} className="status-bar-row">
                  <span>{status}</span>
                  <div className="bar"><i data-status={status} style={{ width: `${stats.total ? (stats.byStatus[status] / stats.total) * 100 : 0}%` }} /></div>
                  <b>{stats.byStatus[status]}</b>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'profile' && (
          <>
            <div className="profile-card">
              <div className="avatar">AY</div>
              <div>
                <strong>ayajuan007</strong>
                <small>Operador del campo · Colombia</small>
              </div>
            </div>
            <p className="profile-note">Sesión local activa. Los datos se guardan automáticamente en este navegador.</p>
            <div className="data-actions">
              <button className="control-button" onClick={onExport}><Download size={14} /> Exportar respaldo</button>
              <button className="control-button" onClick={() => fileInput.current?.click()}><Upload size={14} /> Importar respaldo</button>
              <button className="control-button" onClick={onResetData}><Check size={14} /> Restaurar demo</button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) onImport(file)
                  event.target.value = ''
                }}
              />
            </div>
          </>
        )}

        {tab === 'follow' && (
          <div className="seg-list">
            {[...phases.map((phase) => ({
              key: `ph-${phase.id}`,
              projectId: phase.projectId,
              title: phase.name,
              meta: `${phase.status} · ${phase.date}`,
              detail: phase.projectName,
              color: phase.color,
              progress: phase.progress,
            })),
            ...followUps.map((follow) => ({
              key: `fu-${follow.id}`,
              projectId: follow.projectId,
              title: follow.note,
              meta: follow.date,
              detail: follow.projectName,
              color: follow.color,
              progress: undefined as number | undefined,
            }))].map((item) => (
              <button key={item.key} className="seg-item" onClick={() => onSelect(item.projectId)}>
                <i style={{ background: item.color }} />
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.detail} · {item.meta}</small>
                  {typeof item.progress === 'number' && <div className="bar slim"><i style={{ width: `${item.progress}%`, background: item.color }} /></div>}
                </div>
                {selectedId === item.projectId && <span className="seg-active">FOCO</span>}
              </button>
            ))}
            {phases.length === 0 && followUps.length === 0 && <p className="empty-note">Sin seguimientos registrados.</p>}
          </div>
        )}
      </div>
    </aside>
  )
}
