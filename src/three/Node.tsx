import { useRef, useState } from 'react'
import { DragControls, Html, Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CalendarDays, Minus, Plus, Shuffle, Trash2 } from 'lucide-react'
import * as THREE from 'three'
import type { CSSProperties } from 'react'
import type { Project } from '../types'

const BURST_MS = 850
const OPEN_DELAY = 480

function jitter(seed: number): number {
  const value = Math.sin(seed * 127.1) * 43758.5453
  return value - Math.floor(value)
}

const SHARD_DIRS: THREE.Vector3[] = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2 + jitter(i + 1) * 0.5
  return new THREE.Vector3(
    Math.cos(angle) * (0.75 + jitter(i + 17) * 0.55),
    Math.sin(angle) * (0.55 + jitter(i + 33) * 0.75),
    (jitter(i + 49) - 0.5) * 0.9,
  ).normalize()
})

type NodeProps = {
  project: Project
  selected: boolean
  onSelect: () => void
  onMove: (position: [number, number, number]) => void
  onDragState: (dragging: boolean) => void
  onDelete: (id: string) => void
  onCycleColor: (id: string) => void
  onAdjustProgress: (id: string, delta: number) => void
  onCycleStatus: (id: string) => void
}

export function Node({ project, selected, onSelect, onMove, onDragState, onDelete, onCycleColor, onAdjustProgress, onCycleStatus }: NodeProps) {
  const group = useRef<THREE.Group>(null)
  const ball = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const shardRefs = useRef<(THREE.Mesh | null)[]>([])
  const shardGroup = useRef<THREE.Group>(null)
  const burstStart = useRef(-1)
  const wasSelected = useRef(false)
  const [open, setOpen] = useState(false)

  useFrame(({ clock }) => {
    if (!group.current || !ball.current || !ring.current) return

    if (selected !== wasSelected.current) {
      wasSelected.current = selected
      if (selected) {
        burstStart.current = clock.elapsedTime
        window.setTimeout(() => setOpen(true), OPEN_DELAY)
      } else {
        setOpen(false)
        burstStart.current = -1
      }
    }

    const time = clock.elapsedTime
    group.current.position.y = project.position[1] + Math.sin(time * 0.9 + project.position[0]) * 0.04
    ring.current.rotation.z += 0.004

    const targetScale = selected ? (open ? 1.12 : 1.45) : 1
    const current = group.current.scale.x
    group.current.scale.setScalar(current + (targetScale - current) * 0.09)

    const material = ball.current.material as THREE.MeshStandardMaterial
    const flash = !open && selected ? 0.85 : 0
    const targetEmissive = selected ? 0.5 + flash : 0.12
    material.emissiveIntensity += (targetEmissive - material.emissiveIntensity) * 0.12

    if (shardGroup.current) {
      if (burstStart.current < 0) {
        shardGroup.current.visible = false
      } else {
        const t = ((time - burstStart.current) * 1000) / BURST_MS
        if (t > 1) {
          shardGroup.current.visible = false
        } else {
          shardGroup.current.visible = true
          const eased = 1 - Math.pow(1 - t, 3)
          SHARD_DIRS.forEach((dir, i) => {
            const mesh = shardRefs.current[i]
            if (!mesh) return
            mesh.position.copy(dir).multiplyScalar(0.35 + eased * (1.15 + i * 0.02))
            mesh.scale.setScalar((1 - t) * 0.14 + 0.02)
            ;(mesh.material as THREE.MeshBasicMaterial).opacity = 1 - t
          })
        }
      }
    }
  })

  const handleDrag = (localMatrix: THREE.Matrix4) => {
    const position = new THREE.Vector3()
    localMatrix.decompose(position, new THREE.Quaternion(), new THREE.Vector3())
    onMove([position.x, position.y, position.z])
  }

  const anchorRight: [number, number, number] = [2.7, 0.95, -0.05]
  const anchorLeft: [number, number, number] = [-2.7, 0.95, -0.05]
  const anchorTop: [number, number, number] = [0.1, 2.15, 0.05]

  const statusChipClass =
    project.status === 'Completado' ? 'chip chip-done' : project.status === 'En curso' ? 'chip chip-live' : 'chip chip-plan'

  return (
    <DragControls onDragStart={() => onDragState(true)} onDrag={handleDrag} onDragEnd={() => onDragState(false)} autoTransform>
      <group ref={group} position={project.position} onClick={(event) => { event.stopPropagation(); onSelect() }}>
        <mesh ref={ball}>
          <icosahedronGeometry args={[0.34, 1]} />
          <meshStandardMaterial color={project.color} emissive={project.color} emissiveIntensity={0.12} metalness={0.35} roughness={0.25} />
        </mesh>
        <mesh ref={ring} scale={selected ? 1.7 : 1.35}>
          <ringGeometry args={[0.39, 0.405, 48]} />
          <meshBasicMaterial color={project.color} transparent opacity={selected ? 0.95 : 0.28} side={THREE.DoubleSide} />
        </mesh>

        <group ref={shardGroup} visible={false}>
          {SHARD_DIRS.map((_, i) => (
            <mesh
              key={i}
              ref={(mesh) => {
                shardRefs.current[i] = mesh
              }}
            >
              <tetrahedronGeometry args={[1]} />
              <meshBasicMaterial color={project.color} transparent opacity={0.9} />
            </mesh>
          ))}
        </group>

        <Html center position={[0, -0.62, 0]} distanceFactor={6} zIndexRange={[8, 0]}>
          <div className="node-label" style={{ '--c': project.color } as CSSProperties}>
            <strong>{project.name}</strong>
            <small>{project.code} · {project.progress}%</small>
          </div>
        </Html>

        {open && (
          <>
            <Line points={[[0.3, 0.3, 0], anchorRight]} color={project.color} lineWidth={1} transparent opacity={0.5} />
            <Line points={[[-0.3, 0.3, 0], anchorLeft]} color={project.color} lineWidth={1} transparent opacity={0.5} />
            <Line points={[[0.05, 0.34, 0], anchorTop]} color={project.color} lineWidth={1} transparent opacity={0.5} />

            <Html transform distanceFactor={6.4} position={anchorRight} zIndexRange={[8, 0]}>
              <div className="intel-panel" style={{ '--c': project.color } as CSSProperties}>
                <header><span className="intel-dot" />RESUMEN DEL PROSPECTO</header>
                <div className="intel-body">
                  <p className="intel-summary">{project.summary}</p>
                  <div className="intel-row"><span>ENTREGA</span><b><CalendarDays size={11} /> {project.delivery}</b></div>
                  <div className="intel-row"><span>ESTADO</span>
                    <button className={statusChipClass} onClick={() => onCycleStatus(project.id)}>{project.status.toUpperCase()}</button>
                  </div>
                  <div className="intel-progress">
                    <span>PROGRESO · {project.progress}%</span>
                    <div className="bar"><i style={{ width: `${project.progress}%`, background: project.color }} /></div>
                    <div className="mini-actions">
                      <button className="mini-btn" onClick={() => onAdjustProgress(project.id, -10)} aria-label="Reducir progreso"><Minus size={11} /></button>
                      <button className="mini-btn" onClick={() => onAdjustProgress(project.id, 10)} aria-label="Aumentar progreso"><Plus size={11} /></button>
                    </div>
                  </div>
                  <div className="mini-actions wide">
                    <button className="mini-btn ghosted" onClick={() => onCycleColor(project.id)}><Shuffle size={11} /> COLOR</button>
                    <button className="mini-btn danger" onClick={() => onDelete(project.id)}><Trash2 size={11} /> ELIMINAR</button>
                  </div>
                </div>
              </div>
            </Html>

            <Html transform distanceFactor={6.4} position={anchorLeft} zIndexRange={[8, 0]}>
              <div className="intel-panel" style={{ '--c': project.color } as CSSProperties}>
                <header><span className="intel-dot" />{project.kind === 'empresarial' ? 'FICHA EMPRESARIAL' : 'FICHA PERSONAL'}</header>
                <div className="intel-body">
                  {project.kind === 'empresarial' ? (
                    <>
                      <div className="intel-row"><span>EMPRESA</span><b>{project.company ?? '—'}</b></div>
                      <div className="intel-row"><span>NICHO</span><b>{project.niche ?? '—'}</b></div>
                      <div className="intel-row"><span>VALOR</span><b>{project.value ?? '—'}</b></div>
                      <div className="intel-row"><span>CONTACTO</span><b>{project.contact?.name ?? '—'}</b></div>
                      {project.contact?.email && <div className="intel-row"><span>CORREO</span><b>{project.contact.email}</b></div>}
                      {project.contact?.phone && <div className="intel-row"><span>TELÉFONO</span><b>{project.contact.phone}</b></div>}
                      {project.agreements && project.agreements.length > 0 && (
                        <div className="intel-list">
                          <span>ACUERDOS</span>
                          <ul>{project.agreements.map((item) => <li key={item}>{item}</li>)}</ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {project.ideas && project.ideas.length > 0 && (
                        <div className="intel-list">
                          <span>IDEAS</span>
                          <ul>{project.ideas.map((item) => <li key={item}>{item}</li>)}</ul>
                        </div>
                      )}
                      <div className="intel-row"><span>FECHA META</span><b>{project.delivery}</b></div>
                    </>
                  )}
                  {project.document && (
                    <div className="intel-doc">DOC · {project.document.name}{project.document.pages ? ` (${project.document.pages} pág)` : ''}</div>
                  )}
                </div>
              </div>
            </Html>

            <Html transform distanceFactor={6.4} position={anchorTop} zIndexRange={[8, 0]}>
              <div className="intel-panel wide-panel" style={{ '--c': project.color } as CSSProperties}>
                <header><span className="intel-dot" />FASES · SEGUIMIENTOS</header>
                <div className="intel-body">
                  <table className="phase-table">
                    <thead><tr><th>FASE</th><th>RESP.</th><th>%</th><th>ESTADO</th><th>FECHA</th></tr></thead>
                    <tbody>
                      {project.phases.map((phase) => (
                        <tr key={phase.id}>
                          <td>{phase.name}</td>
                          <td>{phase.owner ?? '—'}</td>
                          <td>{phase.progress}%</td>
                          <td><i className={`pstatus p-${phase.status.toLowerCase()}`} />{phase.status}</td>
                          <td>{phase.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {project.followUps.length > 0 && (
                    <div className="follow-strip">
                      {project.followUps.map((follow) => (
                        <div key={follow.id} className="follow-item"><b>{follow.date}</b>{follow.note}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Html>
          </>
        )}
      </group>
    </DragControls>
  )
}
