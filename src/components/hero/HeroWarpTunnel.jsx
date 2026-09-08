import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text3D, Center } from '@react-three/drei'
import * as THREE from 'three'

// URL de la fuente (puedes usar cualquier JSON de Three.js)
const FONT_URL = 'https://threejs.org/examples/fonts/helvetiker_bold.typeface.json'

const WarpTunnel = ({ count = 200, word = "CINEMATIC" }) => {
  const meshRef = useRef()
  
  // 1. Inicializamos los datos de las partículas (Cilíndricas)
  const particles = useMemo(() => {
    const temp = []
    for (let i = 0; i < count; i++) {
      temp.push({
        z: Math.random() * -500,
        radius: 30 + Math.random() * 15,
        angle: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.8,
      })
    }
    return temp
  }, [count])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const forward = useMemo(() => new THREE.Vector3(0, 0, 1), [])
  const up = useMemo(() => new THREE.Vector3(), [])
  const right = useMemo(() => new THREE.Vector3(), [])
  const matrix = useMemo(() => new THREE.Matrix4(), [])

  // 2. Bucle de animación (60fps)
  useFrame((state, delta) => {
    particles.forEach((p, i) => {
      // Movimiento longitudinal lento
      p.z += p.speed * 0.8
      if (p.z > 20) p.z = -500

      // Posición en el espacio
      const x = Math.cos(p.angle) * p.radius
      const y = Math.sin(p.angle) * p.radius
      dummy.position.set(x, y, p.z)

      // --- LÓGICA DE ALINEACIÓN SOLICITADA ---
      // Calculamos la base orientada al flujo
      up.set(x, y, 0).normalize() // Vector radial
      right.crossVectors(up, forward) // Vector binormal
      
      // Construimos la matriz: Eje X local = forward (movimiento)
      matrix.makeBasis(forward, up, right)
      dummy.quaternion.setFromRotationMatrix(matrix)

      // Estiramiento Anamórfico (Eje X local es ahora el de movimiento)
      const stretch = 25 * (1 + Math.abs(p.z / 500))
      dummy.scale.set(stretch, 1.2, 1.2)

      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      {/* Geometría 3D extruida */}
      <Text3D font={FONT_URL} size={1.5} height={0.2} bevelEnabled={false}>
        {word}
      </Text3D>
      <meshBasicMaterial color="#ff0000" />
    </instancedMesh>
  )
}

// Escena Principal
export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 70, near: 0.1, far: 1000 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#000']} />
        <fog attach="fog" args={['#000', 10, 500]} />
        
        <WarpTunnel count={250} word="HYPERSPACE" />
        
      </Canvas>
    </div>
  )
}
