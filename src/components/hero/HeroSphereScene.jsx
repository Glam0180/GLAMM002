import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import './HeroSphereScene.css'

const BALL_COUNT = 56

function createSurfaceTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')

  context.fillStyle = '#737373'
  context.fillRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < 1100; i += 1) {
    const value = Math.floor(70 + Math.random() * 130)
    const alpha = 0.12 + Math.random() * 0.35
    const size = 1 + Math.random() * 4
    context.fillStyle = `rgba(${value}, ${value}, ${value}, ${alpha})`
    context.beginPath()
    context.arc(Math.random() * 256, Math.random() * 256, size, 0, Math.PI * 2)
    context.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1.8, 1.8)
  return texture
}

export default function HeroSphereScene() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#000000')
    scene.fog = new THREE.Fog('#000000', 8, 15)

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    camera.position.set(0, 0, 9)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor('#000000', 1)
    mount.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)

    const surfaceTexture = createSurfaceTexture()
    const geometry = new THREE.SphereGeometry(1, 30, 22)
    const redMaterial = new THREE.MeshPhysicalMaterial({
      color: '#e50914',
      metalness: 0.28,
      roughness: 0.22,
      clearcoat: 0.72,
      clearcoatRoughness: 0.16,
      bumpMap: surfaceTexture,
      bumpScale: 0.075,
      emissive: '#260000',
      emissiveIntensity: 0.25,
    })
    const blackMaterial = new THREE.MeshPhysicalMaterial({
      color: '#111114',
      metalness: 0.62,
      roughness: 0.19,
      clearcoat: 0.86,
      clearcoatRoughness: 0.12,
      bumpMap: surfaceTexture,
      bumpScale: 0.065,
    })

    const balls = []
    for (let i = 0; i < BALL_COUNT; i += 1) {
      const radius = 0.38 + Math.random() * 0.18
      const ball = new THREE.Mesh(geometry, i % 2 === 0 ? redMaterial : blackMaterial)
      ball.scale.setScalar(radius)
      ball.position.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 6.8, (Math.random() - 0.5) * 1.4)
      ball.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
      group.add(ball)
      balls.push({ mesh: ball, radius, velocity: new THREE.Vector3((Math.random() - 0.5) * 0.035, (Math.random() - 0.5) * 0.035, 0) })
    }

    scene.add(new THREE.HemisphereLight('#f8d9d9', '#100000', 2.2))
    const keyLight = new THREE.DirectionalLight('#ffffff', 3.4)
    keyLight.position.set(-3, 5, 7)
    scene.add(keyLight)
    const redLight = new THREE.PointLight('#ff1d25', 55, 10, 2)
    redLight.position.set(2, -1, 4)
    scene.add(redLight)
    const rimLight = new THREE.PointLight('#ffffff', 30, 9, 2)
    rimLight.position.set(-5, -2, 3)
    scene.add(rimLight)

    const pointer = new THREE.Vector3(100, 100, 0)
    let halfWidth = 6
    let halfHeight = 3.4
    let frameId
    let lastTime = performance.now()

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect()
      if (!width || !height) return
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      halfWidth = Math.max(4.3, camera.aspect * 3.7)
      halfHeight = 3.4
    }

    const movePointer = (event) => {
      const bounds = mount.getBoundingClientRect()
      pointer.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * halfWidth * 2
      pointer.y = -((event.clientY - bounds.top) / bounds.height - 0.5) * halfHeight * 2
    }

    const leavePointer = () => pointer.set(100, 100, 0)
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)
    mount.addEventListener('pointermove', movePointer)
    mount.addEventListener('pointerleave', leavePointer)
    resize()

    const stepPhysics = (step) => {
      for (const ball of balls) {
        const { mesh, radius, velocity } = ball
        velocity.addScaledVector(mesh.position, -0.00075 * step)

        const pointerX = mesh.position.x - pointer.x
        const pointerY = mesh.position.y - pointer.y
        const pointerZ = mesh.position.z - pointer.z
        const distance = Math.hypot(pointerX, pointerY, pointerZ)
        const cursorRadius = radius + 1.15
        if (distance > 0.001 && distance < cursorRadius) {
          const strength = (cursorRadius - distance) * 0.028 * step / distance
          velocity.x += pointerX * strength
          velocity.y += pointerY * strength
          velocity.z += pointerZ * strength
        }

        velocity.multiplyScalar(Math.pow(0.987, step))
        mesh.position.addScaledVector(velocity, step)
        mesh.rotation.x += velocity.y * 0.45
        mesh.rotation.y += velocity.x * 0.45

        if (mesh.position.x > halfWidth - radius || mesh.position.x < -halfWidth + radius) {
          mesh.position.x = THREE.MathUtils.clamp(mesh.position.x, -halfWidth + radius, halfWidth - radius)
          velocity.x *= -0.72
        }
        if (mesh.position.y > halfHeight - radius || mesh.position.y < -halfHeight + radius) {
          mesh.position.y = THREE.MathUtils.clamp(mesh.position.y, -halfHeight + radius, halfHeight - radius)
          velocity.y *= -0.72
        }
      }

      for (let i = 0; i < balls.length; i += 1) {
        for (let j = i + 1; j < balls.length; j += 1) {
          const a = balls[i]
          const b = balls[j]
          const dx = b.mesh.position.x - a.mesh.position.x
          const dy = b.mesh.position.y - a.mesh.position.y
          const dz = b.mesh.position.z - a.mesh.position.z
          const distance = Math.hypot(dx, dy, dz) || 0.001
          const minDistance = a.radius + b.radius
          if (distance >= minDistance) continue

          const nx = dx / distance
          const ny = dy / distance
          const nz = dz / distance
          const overlap = (minDistance - distance) * 0.52
          a.mesh.position.x -= nx * overlap
          a.mesh.position.y -= ny * overlap
          a.mesh.position.z -= nz * overlap
          b.mesh.position.x += nx * overlap
          b.mesh.position.y += ny * overlap
          b.mesh.position.z += nz * overlap

          const closingSpeed = (b.velocity.x - a.velocity.x) * nx
            + (b.velocity.y - a.velocity.y) * ny
            + (b.velocity.z - a.velocity.z) * nz
          if (closingSpeed < 0) {
            const impulse = -closingSpeed * 0.66
            a.velocity.x -= nx * impulse
            a.velocity.y -= ny * impulse
            a.velocity.z -= nz * impulse
            b.velocity.x += nx * impulse
            b.velocity.y += ny * impulse
            b.velocity.z += nz * impulse
          }
        }
      }
    }

    const render = (time) => {
      const step = Math.min((time - lastTime) / 16.67, 2.2)
      lastTime = time
      stepPhysics(step)
      group.rotation.y = Math.sin(time * 0.00016) * 0.08
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(render)
    }
    frameId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      mount.removeEventListener('pointermove', movePointer)
      mount.removeEventListener('pointerleave', leavePointer)
      geometry.dispose()
      redMaterial.dispose()
      blackMaterial.dispose()
      surfaceTexture.dispose()
      renderer.dispose()
      mount.replaceChildren()
    }
  }, [])

  return <div ref={mountRef} className="hero-spheres" aria-label="Esferas 3D interactivas" />
}
