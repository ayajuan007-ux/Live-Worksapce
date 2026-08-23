import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Html, Lightformer, MeshReflectorMaterial, OrbitControls, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, SMAA, Vignette } from '@react-three/postprocessing'
import { CalendarDays, GripHorizontal, Minus, Plus, Shuffle, Trash2, X } from 'lucide-react'
import * as THREE from 'three'
import type { CSSProperties } from 'react'
import type { PanelKey, Project, Vec3 } from '../types'
import { jitter } from '../types'

const BURST_MS = 850

const SHARD_DIRS: THREE.Vector3[] = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2 + jitter(i + 1) * 0.5
  return new THREE.Vector3(
    Math.cos(angle) * (0.75 + jitter(i + 17) * 0.55),
    Math.sin(angle) * (0.55 + jitter(i + 33) * 0.75),
    (jitter(i + 49) - 0.5) * 0.9,
  ).normalize()
})

const ANCHORS: Record<PanelKey, Vec3> = {
  resumen: [3.05, 0.85, 0],
  ficha: [-3.05, 0.85, 0],
  fases: [0.15, 2.65, 0],
}

type DetailModeProps = {
  project: Project
  onClose: () => void
  onDelete: (id: string) => void
  onCycleColor: (id: string) => void
  onAdjustProgress: (id: string, delta: number) => void
  onCycleStatus: (id: string) => void
  onCommitOffsets: (id: string, key: PanelKey, offset: Vec3) => void
}

function Shards({ color }: { color: string }) {
  const group = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!group.current) return
    const t = (clock.elapsedTime * 1000) / BURST_MS
    if (t > 1) {
      group.current.visible = false
      return
    }
    group.current.visible = true
    const eased = 1 - Math.pow(1 - t, 3)
    SHARD_DIRS.forEach((dir, i) => {
      const mesh = group.current!.children[i] as THREE.Mesh
      mesh.position.copy(dir).multiplyScalar(0.45 + eased * (1.7 + i * 0.03))
      mesh.scale.setScalar((1 - t) * 0.2 + 0.02)
      ;(mesh.material as THREE.MeshBasicMaterial).opacity = 1 - t
    })
  })

  return (
    <group>
      {SHARD_DIRS.map((_, i) => (
        <mesh key={i}>
          <tetrahedronGeometry args={[1]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function FocusedBall({ project }: { project: Project }) {
  const group = useRef<THREE.Group>(null)
  const ball = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!group.current || !ball.current || !ring.current) return
    const time = clock.elapsedTime
    group.current.position.y = Math.sin(time * 0.8) * 0.06
    ring.current.rotation.z += 0.004

    const targetScale = 1.45 + Math.sin(time * 1.6) * 0.03
    const current = group.current.scale.x
    group.current.scale.setScalar(current + (targetScale - current) * 0.08)

    const material = ball.current.material as THREE.MeshStandardMaterial
    const flash = time < 0.6 ? 1.1 : 0
    material.emissiveIntensity += (0.55 + flash - material.emissiveIntensity) * 0.08
  })

  return (
    <group ref={group}>
      <mesh ref={ball} castShadow>
        <icosahedronGeometry args={[0.34, 2]} />
        <meshStandardMaterial color={project.color} emissive={project.color} emissiveIntensity={0.5} metalness={0.85} roughness={0.18} envMapIntensity={1.6} flatShading />
      </mesh>
      <mesh scale={0.55}>
        <icosahedronGeometry args={[0.34, 1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.75} />
      </mesh>
      <mesh ref={ring} scale={1.75}>
        <ringGeometry args={[0.39, 0.405, 64]} />
        <meshBasicMaterial color={project.color} transparent opacity={0.95} side={THREE.DoubleSide} />
      </mesh>
      <Shards color={project.color} />
    </group>
  )
}

function MiniSun() {
  return (
    <group position={[-13, 7.5, -26]}>
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color="#ffb347" fog={false} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.1, 24, 24]} />
        <meshBasicMaterial color="#ff8c42" transparent opacity={0.14} fog={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

function DetailSceneContents({ project, children }: { project: Project; children: React.ReactNode }) {
  return (
    <>
      <color attach="background" args={['#010302']} />
      <fog attach="fog" args={['#010302', 16, 60]} />

      <hemisphereLight intensity={0.4} color="#bfeadd" groundColor="#0a1410" />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[4, 6, 4]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-bias={-0.0005}
      />
      <pointLight position={[-4, 1, 3]} intensity={10} distance={10} color={project.color} />

      <Environment resolution={256}>
        <Lightformer intensity={2.4} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} color="#bfffec" />
        <Lightformer intensity={1.8} position={[-6, 1, 0]} rotation-y={Math.PI / 2} scale={[7, 2.4, 1]} color={project.color} />
        <Lightformer intensity={1.4} position={[6, 0, 1]} rotation-y={-Math.PI / 2} scale={[7, 2.4, 1]} color="#bc8cff" />
      </Environment>

      <Stars radius={60} depth={35} count={2200} factor={3.6} saturation={0.5} fade speed={0.6} />
      <MiniSun />

      <mesh rotation-x={-Math.PI / 2} position={[0, -1.42, 0]} receiveShadow>
        <circleGeometry args={[3.4, 64]} />
        <MeshReflectorMaterial
          blur={[240, 60]}
          resolution={512}
          mixBlur={22}
          mixStrength={12}
          mirror={0.45}
          color="#04150e"
          metalness={0.7}
          roughness={0.8}
        />
      </mesh>

      <FocusedBall project={project} />
      {children}

      <OrbitControls enablePan={false} enableDamping dampingFactor={0.09} minDistance={2} maxDistance={11} makeDefault />

      <EffectComposer multisampling={0}>
        <Bloom intensity={0.95} luminanceThreshold={0.22} luminanceSmoothing={0.24} mipmapBlur radius={0.7} />
        <SMAA />
        <Vignette offset={0.2} darkness={0.75} eskil={false} />
      </EffectComposer>
    </>
  )
}

type DragState = { key: PanelKey; startX: number; startY: number; base: Vec3 }

export function DetailMode(props: DetailModeProps) {
  const { camera, size } = useThree()
  const drag = useRef<DragState | null>(null)
  const [preview, setPreview] = useState<Partial<Record<PanelKey, Vec3>>>({})

  useEffect(() => {
    document.body.style.cursor = 'auto'
  }, [])

  const offsetFor = (key: PanelKey): Vec3 => preview[key] ?? props.project.panelOffsets?.[key] ?? [0, 0, 0]

  const worldPerPixel = (): number => {
    const dist = camera.position.length()
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
    return (2 * Math.tan(fov / 2) * dist) / size.height
  }

  const onDown = (event: ReactPointerEvent<HTMLElement>, key: PanelKey) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { key, startX: event.clientX, startY: event.clientY, base: [...offsetFor(key)] }
  }

  const onMove = (event: ReactPointerEvent<HTMLElement>) => {
    const state = drag.current
    if (!state) return
    const wpp = worldPerPixel()
    const next: Vec3 = [
      state.base[0] + (event.clientX - state.startX) * wpp,
      state.base[1] - (event.clientY - state.startY) * wpp,
      state.base[2],
    ]
    setPreview((prev) => ({ ...prev, [state.key]: next }))
  }

  const onUp = () => {
    const state = drag.current
    if (!state) return
    const final = preview[state.key] ?? state.base
    props.onCommitOffsets(props.project.id, state.key, final)
    drag.current = null
  }

  const statusChipClass =
    props.project.status === 'Completado' ? 'chip chip-done' : props.project.status === 'En curso' ? 'chip chip-live' : 'chip chip-plan'

  const renderPanel = (key: PanelKey) => {
    const offset = offsetFor(key)
    const position: Vec3 = [ANCHORS[key][0] + offset[0], ANCHORS[key][1] + offset[1], ANCHORS[key][2] + offset[2]]
    const style = { '--c': props.project.color } as CSSProperties

    const header = (
      <header
        className="intel-drag"
        onPointerDown={(event) => onDown(event, key)}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <span className="intel-dot" />
        {key === 'resumen' ? 'RESUMEN DEL PROSPECTO' : key === 'ficha' ? (props.project.kind === 'empresarial' ? 'FICHA EMPRESARIAL' : 'FICHA PERSONAL') : 'FASES · SEGUIMIENTOS'}
        <GripHorizontal size={12} className="drag-grip" />
      </header>
    )

    const body = (() => {
      if (key === 'resumen') {
        return (
          <div className="intel-body">
            <p className="intel-summary">{props.project.summary}</p>
            <div className="intel-row"><span>ENTREGA</span><b><CalendarDays size={11} /> {props.project.delivery}</b></div>
            <div className="intel-row"><span>ESTADO</span>
              <button className={statusChipClass} onClick={() => props.onCycleStatus(props.project.id)}>{props.project.status.toUpperCase()}</button>
            </div>
            <div className="intel-progress">
              <span>PROGRESO · {props.project.progress}%</span>
              <div className="bar"><i style={{ width: `${props.project.progress}%`, background: props.project.color }} /></div>
              <div className="mini-actions">
                <button className="mini-btn" onClick={() => props.onAdjustProgress(props.project.id, -10)} aria-label="Reducir progreso"><Minus size={11} /></button>
                <button className="mini-btn" onClick={() => props.onAdjustProgress(props.project.id, 10)} aria-label="Aumentar progreso"><Plus size={11} /></button>
              </div>
            </div>
            <div className="mini-actions wide">
              <button className="mini-btn ghosted" onClick={() => props.onCycleColor(props.project.id)}><Shuffle size={11} /> COLOR</button>
              <button className="mini-btn danger" onClick={() => props.onDelete(props.project.id)}><Trash2 size={11} /> ELIMINAR</button>
            </div>
          </div>
        )
      }
      if (key === 'ficha') {
        return (
          <div className="intel-body">
            {props.project.kind === 'empresarial' ? (
              <>
                <div className="intel-row"><span>EMPRESA</span><b>{props.project.company ?? '—'}</b></div>
                <div className="intel-row"><span>NICHO</span><b>{props.project.niche ?? '—'}</b></div>
                <div className="intel-row"><span>VALOR</span><b>{props.project.value ?? '—'}</b></div>
                <div className="intel-row"><span>CONTACTO</span><b>{props.project.contact?.name ?? '—'}</b></div>
                {props.project.contact?.email && <div className="intel-row"><span>CORREO</span><b>{props.project.contact.email}</b></div>}
                {props.project.contact?.phone && <div className="intel-row"><span>TELÉFONO</span><b>{props.project.contact.phone}</b></div>}
                {props.project.agreements && props.project.agreements.length > 0 && (
                  <div className="intel-list">
                    <span>ACUERDOS</span>
                    <ul>{props.project.agreements.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                )}
              </>
            ) : (
              <>
                {props.project.ideas && props.project.ideas.length > 0 && (
                  <div className="intel-list">
                    <span>IDEAS</span>
                    <ul>{props.project.ideas.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                )}
                <div className="intel-row"><span>FECHA META</span><b>{props.project.delivery}</b></div>
              </>
            )}
            {props.project.document && (
              <div className="intel-doc">DOC · {props.project.document.name}{props.project.document.pages ? ` (${props.project.document.pages} pág)` : ''}</div>
            )}
          </div>
        )
      }
      return (
        <div className="intel-body">
          <table className="phase-table">
            <thead><tr><th>FASE</th><th>RESP.</th><th>%</th><th>ESTADO</th><th>FECHA</th></tr></thead>
            <tbody>
              {props.project.phases.map((phase) => (
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
          {props.project.followUps.length > 0 && (
            <div className="follow-strip">
              {props.project.followUps.map((follow) => (
                <div key={follow.id} className="follow-item"><b>{follow.date}</b>{follow.note}</div>
              ))}
            </div>
          )}
        </div>
      )
    })()

    return (
      <Html key={key} transform distanceFactor={6.4} position={position} zIndexRange={[8, 0]}>
        <div className={`intel-panel ${key === 'fases' ? 'wide-panel' : ''}`} style={style}>
          {header}
          {body}
        </div>
      </Html>
    )
  }

  return (
    <>
      {(Object.keys(ANCHORS) as PanelKey[]).map((key) => renderPanel(key))}
    </>
  )
}

export function DetailModeCanvas(props: DetailModeProps) {
  return (
    <div className="detail-overlay">
      <div className="detail-topbar">
        <div className="detail-id" style={{ '--c': props.project.color } as CSSProperties}>
          <i />
          <strong>{props.project.name}</strong>
          <small>{props.project.code} · CAMPO DE INSPECCIÓN</small>
        </div>
        <span className="detail-hint">ARRASTRA LOS PANELES DESDE SU TÍTULO · RUEDA = ZOOM · ESC = VOLVER</span>
        <button className="icon-btn detail-close" onClick={props.onClose} aria-label="Volver al campo"><X size={17} /></button>
      </div>
      <Canvas
        className="scene-canvas"
        shadows="soft"
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0.7, 5.6], fov: 46, near: 0.01, far: 200 }}
      >
        <DetailSceneContents project={props.project}>
          <DetailMode {...props} />
        </DetailSceneContents>
      </Canvas>
    </div>
  )
}
