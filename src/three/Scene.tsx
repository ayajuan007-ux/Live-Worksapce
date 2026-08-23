import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, Line, MeshReflectorMaterial, OrbitControls, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, SMAA, Vignette } from '@react-three/postprocessing'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import type { Connection, Project } from '../types'
import { Node } from './Node'
import { Celestials } from './Celestials'

export type FocusRequest = { position: [number, number, number]; distance: number; token: number }

type SceneProps = {
  projects: Project[]
  visibleIds: Set<string>
  selectedId: string
  connections: Connection[]
  linkFirstId: string | null
  onSelect: (id: string) => void
  onMove: (id: string, position: [number, number, number]) => void
  onDelete: (id: string) => void
  onCycleColor: (id: string) => void
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

function StudioEnvironment() {
  return (
    <Environment resolution={256}>
      <Lightformer intensity={2.2} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} color="#bfffec" />
      <Lightformer intensity={1.6} position={[-6, 1.5, -1]} rotation-y={Math.PI / 2} scale={[7, 2.4, 1]} color="#d8ff63" />
      <Lightformer intensity={1.6} position={[6, 0.5, 1]} rotation-y={-Math.PI / 2} scale={[7, 2.4, 1]} color="#bc8cff" />
      <Lightformer intensity={1.1} position={[0, 0.5, 7]} scale={[8, 1.8, 1]} color="#62f5d0" />
    </Environment>
  )
}

function MirrorFloor() {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -1.86, 0]} receiveShadow>
      <planeGeometry args={[90, 90]} />
      <MeshReflectorMaterial
        blur={[280, 60]}
        resolution={1024}
        mixBlur={28}
        mixStrength={14}
        mirror={0.42}
        depthScale={1.1}
        minDepthThreshold={0.85}
        maxDepthThreshold={1.3}
        color="#03120c"
        metalness={0.72}
        roughness={0.82}
      />
    </mesh>
  )
}

export function Scene(props: SceneProps) {
  const controls = useRef<OrbitControlsImpl | null>(null)
  const [dragging, setDragging] = useState(false)

  const byId = new Map(props.projects.map((project) => [project.id, project]))
  const links = props.connections
    .map((connection) => ({
      key: `${connection.a}-${connection.b}`,
      a: byId.get(connection.a),
      b: byId.get(connection.b),
    }))
    .filter((link): link is { key: string; a: Project; b: Project } => Boolean(link.a && link.b))
    .filter((link) => props.visibleIds.has(link.a.id) || props.visibleIds.has(link.b.id))

  return (
    <Canvas
      className="scene-canvas"
      shadows="soft"
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 1.6, 8], fov: 44, near: 0.01, far: 600 }}
      onPointerMissed={() => props.onSelect('')}
    >
      <color attach="background" args={['#010302']} />
      <fog attach="fog" args={['#010302', 26, 120]} />

      {/* Luz hemisférica suave para evitar negros puros */}
      <hemisphereLight intensity={0.35} color="#bfeadd" groundColor="#0a1410" />
      <ambientLight intensity={0.22} />

      {/* Sol principal con sombras PCF suaves */}
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.25}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-bias={-0.0004}
      />
      <pointLight position={[-4, 1.2, 2]} intensity={9} distance={9} color="#62f5d0" />
      <pointLight position={[4, -0.8, -2]} intensity={7} distance={11} color="#bc8cff" />

      <StudioEnvironment />

      <Stars radius={95} depth={50} count={3200} factor={4.2} saturation={0.5} fade speed={0.7} />
      <MirrorFloor />
      <Celestials />

      {links.map((link) => (
        <Line
          key={link.key}
          points={[link.a.position, link.b.position]}
          color={link.a.color}
          lineWidth={1.4}
          transparent
          opacity={0.55}
          dashed
          dashSize={0.16}
          gapSize={0.12}
        />
      ))}

      {props.projects.map((project) => (
        <Node
          key={project.id}
          project={project}
          highlighted={project.id === props.selectedId || project.id === props.linkFirstId}
          onClick={() => props.onSelect(project.id)}
          onMove={(position) => props.onMove(project.id, position)}
          onDragState={setDragging}
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

      <EffectComposer multisampling={0}>
        <Bloom intensity={1.05} luminanceThreshold={0.22} luminanceSmoothing={0.24} mipmapBlur radius={0.72} />
        <SMAA />
        <Vignette offset={0.22} darkness={0.78} eskil={false} />
      </EffectComposer>
    </Canvas>
  )
}
