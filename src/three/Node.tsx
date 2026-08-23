import { useRef, useState } from 'react'
import { DragControls, Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { CSSProperties } from 'react'
import type { Project } from '../types'

const OPEN_PULSE_MS = 420

type NodeProps = {
  project: Project
  highlighted: boolean
  onClick: () => void
  onMove: (position: [number, number, number]) => void
  onDragState: (dragging: boolean) => void
}

export function Node({ project, highlighted, onClick, onMove, onDragState }: NodeProps) {
  const group = useRef<THREE.Group>(null)
  const ball = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const wasHighlighted = useRef(false)
  const pulseStart = useRef(-1)
  const [hovered, setHovered] = useState(false)

  useFrame(({ clock }) => {
    if (!group.current || !ball.current || !ring.current) return

    if (highlighted !== wasHighlighted.current) {
      wasHighlighted.current = highlighted
      if (highlighted) pulseStart.current = clock.elapsedTime
      else pulseStart.current = -1
    }

    const time = clock.elapsedTime
    group.current.position.y = project.position[1] + Math.sin(time * 0.9 + project.position[0]) * 0.04
    ring.current.rotation.z += 0.004

    let targetScale = (highlighted ? 1.3 : 1) * (hovered ? 1.09 : 1)
    if (pulseStart.current >= 0) {
      const pulse = Math.min(1, ((time - pulseStart.current) * 1000) / OPEN_PULSE_MS)
      targetScale *= 1 + Math.sin(pulse * Math.PI) * 0.45
    }
    const current = group.current.scale.x
    group.current.scale.setScalar(current + (targetScale - current) * 0.1)

    const material = ball.current.material as THREE.MeshStandardMaterial
    const targetEmissive = (highlighted ? 0.55 : 0.16) + (hovered ? 0.22 : 0)
    material.emissiveIntensity += (targetEmissive - material.emissiveIntensity) * 0.12
  })

  const handleDrag = (localMatrix: THREE.Matrix4) => {
    const position = new THREE.Vector3()
    localMatrix.decompose(position, new THREE.Quaternion(), new THREE.Vector3())
    onMove([position.x, position.y, position.z])
  }

  return (
    <DragControls onDragStart={() => onDragState(true)} onDrag={handleDrag} onDragEnd={() => onDragState(false)} autoTransform>
      <group ref={group} position={project.position} scale={0.001} onClick={(event) => { event.stopPropagation(); onClick() }}>
        <mesh
          ref={ball}
          castShadow
          onPointerOver={(event) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
        >
          <icosahedronGeometry args={[0.34, 2]} />
          <meshStandardMaterial color={project.color} emissive={project.color} emissiveIntensity={0.16} metalness={0.85} roughness={0.18} envMapIntensity={1.5} flatShading />
        </mesh>
        <mesh scale={0.55}>
          <icosahedronGeometry args={[0.34, 1]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={highlighted ? 0.85 : 0.22} />
        </mesh>
        <mesh ref={ring} scale={highlighted ? 1.7 : 1.35}>
          <ringGeometry args={[0.39, 0.405, 64]} />
          <meshBasicMaterial color={project.color} transparent opacity={highlighted ? 0.95 : 0.28} side={THREE.DoubleSide} />
        </mesh>

        <Html center position={[0, -0.62, 0]} distanceFactor={6} zIndexRange={[8, 0]}>
          <div className="node-label" style={{ '--c': project.color } as CSSProperties}>
            <strong>{project.name}</strong>
            <small>{project.code} · {project.progress}%</small>
          </div>
        </Html>
      </group>
    </DragControls>
  )
}
