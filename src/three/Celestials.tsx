import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { jitter } from '../types'

function makeTexture(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  draw(ctx, canvas.width, canvas.height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function jupiterTexture(): THREE.CanvasTexture {
  const bands = ['#e8d0aa', '#c19a6b', '#ddc39a', '#b5875b', '#e3c79f', '#a97748', '#d9bd93']
  return makeTexture((ctx, w, h) => {
    const bandHeight = h / bands.length
    bands.forEach((color, i) => {
      ctx.fillStyle = color
      ctx.fillRect(0, i * bandHeight, w, bandHeight + 1)
    })
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.04 + jitter(i) * 0.06})`
      const y = jitter(i + 100) * h
      ctx.fillRect(0, y, w, 1.5 + jitter(i + 200) * 2)
    }
    ctx.fillStyle = '#cd5c5c'
    ctx.beginPath()
    ctx.ellipse(w * 0.68, h * 0.62, 34, 16, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(160,60,50,0.7)'
    ctx.lineWidth = 4
    ctx.stroke()
  })
}

function earthTexture(): THREE.CanvasTexture {
  return makeTexture((ctx, w, h) => {
    const ocean = ctx.createLinearGradient(0, 0, 0, h)
    ocean.addColorStop(0, '#0a2f6b')
    ocean.addColorStop(0.5, '#0d4f9e')
    ocean.addColorStop(1, '#0a2f6b')
    ctx.fillStyle = ocean
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 26; i++) {
      const x = jitter(i + 5) * w
      const y = h * 0.18 + jitter(i + 55) * h * 0.64
      ctx.fillStyle = `rgb(${40 + jitter(i + 7) * 30}, ${120 + jitter(i + 17) * 50}, ${70 + jitter(i + 27) * 30})`
      ctx.beginPath()
      for (let p = 0; p < 9; p++) {
        const angle = (p / 9) * Math.PI * 2
        const radius = 14 + jitter(i * 10 + p) * 22
        ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius * 0.6)
      }
      ctx.closePath()
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(240,248,255,0.92)'
    ctx.fillRect(0, 0, w, 12)
    ctx.fillRect(0, h - 12, w, 12)
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.08 + jitter(i + 300) * 0.12})`
      ctx.beginPath()
      ctx.ellipse(jitter(i + 310) * w, jitter(i + 320) * h, 20 + jitter(i + 330) * 34, 4 + jitter(i + 340) * 5, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

function moonTexture(): THREE.CanvasTexture {
  return makeTexture((ctx, w, h) => {
    ctx.fillStyle = '#9c9c94'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(${70 + jitter(i) * 40},${70 + jitter(i + 1) * 40},${70 + jitter(i + 2) * 40},${0.25 + jitter(i + 3) * 0.3})`
      ctx.beginPath()
      ctx.arc(jitter(i + 11) * w, jitter(i + 21) * h, 2 + jitter(i + 31) * 9, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

export function Celestials() {
  const jupiterMap = useMemo(() => jupiterTexture(), [])
  const earthMap = useMemo(() => earthTexture(), [])
  const moonMap = useMemo(() => moonTexture(), [])
  const moonOrbit = useRef<THREE.Group>(null)
  const bhRingA = useRef<THREE.Mesh>(null)
  const bhRingB = useRef<THREE.Mesh>(null)
  const jupiterMesh = useRef<THREE.Mesh>(null)
  const earthMesh = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (moonOrbit.current) moonOrbit.current.rotation.y = clock.elapsedTime * 0.14
    if (bhRingA.current) bhRingA.current.rotation.z += 0.0022
    if (bhRingB.current) bhRingB.current.rotation.z -= 0.0016
    if (jupiterMesh.current) jupiterMesh.current.rotation.y += 0.0011
    if (earthMesh.current) earthMesh.current.rotation.y += 0.0016
  })

  return (
    <group>
      {/* SOL */}
      <mesh position={[-19, 10, -42]}>
        <sphereGeometry args={[3.4, 48, 48]} />
        <meshBasicMaterial color="#ffb347" fog={false} toneMapped={false} />
      </mesh>
      <mesh position={[-19, 10, -42]}>
        <sphereGeometry args={[4.4, 32, 32]} />
        <meshBasicMaterial color="#ff8c42" transparent opacity={0.16} fog={false} toneMapped={false} />
      </mesh>

      {/* JÚPITER */}
      <mesh ref={jupiterMesh} position={[28, 13, -52]} rotation-z={0.18}>
        <sphereGeometry args={[3.6, 48, 48]} />
        <meshStandardMaterial map={jupiterMap} roughness={0.85} metalness={0} fog={false} />
      </mesh>

      {/* TIERRA + LUNA */}
      <group position={[17, -6, -34]}>
        <mesh ref={earthMesh}>
          <sphereGeometry args={[1.35, 48, 48]} />
          <meshStandardMaterial map={earthMap} roughness={0.65} metalness={0.05} fog={false} />
        </mesh>
        <group ref={moonOrbit}>
          <mesh position={[2.6, 0.4, 0]}>
            <sphereGeometry args={[0.36, 24, 24]} />
            <meshStandardMaterial map={moonMap} roughness={0.95} fog={false} />
          </mesh>
        </group>
      </group>

      {/* AGUJERO NEGRO */}
      <group position={[-26, -9, -40]} rotation-x={1.15}>
        <mesh>
          <sphereGeometry args={[1.7, 48, 48]} />
          <meshBasicMaterial color="#000000" fog={false} />
        </mesh>
        <mesh ref={bhRingA}>
          <torusGeometry args={[2.6, 0.16, 2, 96]} />
          <meshBasicMaterial color="#ff8164" fog={false} toneMapped={false} />
        </mesh>
        <mesh ref={bhRingB} rotation-x={0.12}>
          <torusGeometry args={[3.3, 0.09, 2, 96]} />
          <meshBasicMaterial color="#bc8cff" fog={false} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}
