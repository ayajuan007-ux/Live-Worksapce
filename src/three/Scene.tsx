import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import type { Project } from '../types'
import { Node } from './Node'

export type FocusRequest = { position: [number, number, number]; distance: number; token: number }

type SceneProps = {
  projects: Project[]
  selectedId: string
  onSelect: (id: string) => void
  onMove: (id: string, position: [number, number, number]) => void
  onDelete: (id: string) => void
  onCycleColor: (id: string) => void
  onAdjustProgress: (id: string, delta: number) => void
  onCycleStatus: (id: string) => void
  focus: FocusRequest
}

function CameraRig({ controls, focus }: { controls: React.RefObject<OrbitControlsImpl | null>; focus: FocusRequest }) {
  const goal = useRef<{ target: THREE.Vector3; distance: number } | null>(null)

  useEffect(() => {
    if (!focus.token) return
    goal.current = { target: new THREE.Vector3(...focus.position), distance: focus.distance }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus.token])

  useFrame(({ camera }) => {
    const active = goal.current
    if (!active || !controls.current) return
    controls.current.target.lerp(active.target, 0.085)
    const direction = camera.position.clone().sub(controls.current.target).normalize()
    const desired = active.target.clone().add(direction.multiplyScalar(active.distance))
    camera.position.lerp(desired, 0.085)
    if (camera.position.distanceTo(desired) < 0.04) goal.current = null
  })

  return null
}

export function Scene(props: SceneProps) {
  const controls = useRef<OrbitControlsImpl | null>(null)
  const [dragging, setDragging] = useState(false)

  return (
    <Canvas
      className="scene-canvas"
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ position: [0, 1.4, 7.6], fov: 44, near: 0.01, far: 600 }}
      onPointerMissed={() => props.onSelect('')}
    >
      <color attach="background" args={['#020403']} />
      <fog attach="fog" args={['#020403', 16, 55]} />

      <ambientLight intensity={1.25} />
      <directionalLight position={[3, 4, 5]} intensity={1.9} />
      <pointLight position={[-4, 1, 2]} intensity={18} distance={9} color="#62f5d0" />
      <pointLight position={[4, -1, -2]} intensity={14} distance={10} color="#bc8cff" />

      <Stars radius={90} depth={45} count={2400} factor={4} saturation={0.4} fade speed={0.6} />
      <gridHelper args={[34, 68, '#29352e', '#0e1711']} position={[0, -1.85, 0]} />

      {props.projects.map((project) => (
        <Node
          key={project.id}
          project={project}
          selected={project.id === props.selectedId}
          onSelect={() => props.onSelect(project.id)}
          onMove={(position) => props.onMove(project.id, position)}
          onDragState={setDragging}
          onDelete={props.onDelete}
          onCycleColor={props.onCycleColor}
          onAdjustProgress={props.onAdjustProgress}
          onCycleStatus={props.onCycleStatus}
        />
      ))}

      <OrbitControls
        ref={controls}
        enabled={!dragging}
        enablePan
        enableDamping
        dampingFactor={0.08}
        zoomSpeed={1.35}
        panSpeed={0.9}
        minDistance={0.02}
        maxDistance={400}
        makeDefault
      />
      <CameraRig controls={controls} focus={props.focus} />
    </Canvas>
  )
}
