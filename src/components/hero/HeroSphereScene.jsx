import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import './HeroSphereScene.css'

const STAR_COUNT = 46

function createStarGeometry() {
  const shape = new THREE.Shape()
  for (let index = 0; index < 10; index += 1) {
    const angle = Math.PI / 2 + (index * Math.PI) / 5
    const radius = index % 2 === 0 ? 1 : 0.46
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.075,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.025,
    bevelThickness: 0.025,
  })
  geometry.center()
  return geometry
}

export default function HeroSphereScene() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#000000')
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    camera.position.set(0, 0, 9)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor('#000000', 1)
    mount.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)

    const geometry = createStarGeometry()
    const redGlass = new THREE.MeshPhysicalMaterial({
      color: '#ff2734', transparent: true, opacity: 0.9, metalness: 0.08, roughness: 0.12,
      transmission: 0.38, thickness: 0.42, ior: 1.45, clearcoat: 1, clearcoatRoughness: 0.08,
      specularIntensity: 1, emissive: '#3a0004', emissiveIntensity: 0.2,
    })
    const blackGlass = new THREE.MeshPhysicalMaterial({
      color: '#202126', transparent: true, opacity: 0.82, metalness: 0.28, roughness: 0.1,
      transmission: 0.24, thickness: 0.38, ior: 1.5, clearcoat: 1, clearcoatRoughness: 0.06, specularIntensity: 1,
    })
    const redMatte = new THREE.MeshPhysicalMaterial({ color: '#bf1420', roughness: 0.62, metalness: 0.06, clearcoat: 0.12 })
    const blackMatte = new THREE.MeshPhysicalMaterial({ color: '#131316', roughness: 0.7, metalness: 0.12, clearcoat: 0.08 })
    const materials = [redGlass, blackGlass, redMatte, blackMatte]

    const stars = []
    for (let index = 0; index < STAR_COUNT; index += 1) {
      const radius = 0.42 + Math.random() * 0.2
      const star = new THREE.Mesh(geometry, materials[index % materials.length])
      star.scale.setScalar(radius)
      star.position.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 6.8, (Math.random() - 0.5) * 0.42)
      star.rotation.z = Math.random() * Math.PI * 2
      group.add(star)
      stars.push({ mesh: star, radius, velocity: new THREE.Vector3((Math.random() - 0.5) * 0.028, (Math.random() - 0.5) * 0.028, 0), spin: (Math.random() - 0.5) * 0.008 })
    }

    scene.add(new THREE.HemisphereLight('#ffffff', '#120000', 2.8))
    const keyLight = new THREE.DirectionalLight('#ffffff', 4)
    keyLight.position.set(-3, 4, 6)
    scene.add(keyLight)
    const redLight = new THREE.PointLight('#ff1d25', 36, 9, 2)
    redLight.position.set(3, -1, 4)
    scene.add(redLight)
    const softLight = new THREE.PointLight('#cdd7ff', 22, 8, 2)
    softLight.position.set(-4, 1, 3)
    scene.add(softLight)

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
      for (const star of stars) {
        const { mesh, radius, velocity } = star
        velocity.addScaledVector(mesh.position, -0.00064 * step)
        const dx = mesh.position.x - pointer.x
        const dy = mesh.position.y - pointer.y
        const dz = mesh.position.z - pointer.z
        const distance = Math.hypot(dx, dy, dz)
        const cursorRadius = radius + 1.1
        if (distance > 0.001 && distance < cursorRadius) {
          const strength = (cursorRadius - distance) * 0.028 * step / distance
          velocity.x += dx * strength
          velocity.y += dy * strength
          velocity.z += dz * strength
        }
        velocity.multiplyScalar(Math.pow(0.987, step))
        mesh.position.addScaledVector(velocity, step)
        mesh.rotation.z += star.spin * step + velocity.x * 0.04
        if (mesh.position.x > halfWidth - radius || mesh.position.x < -halfWidth + radius) {
          mesh.position.x = THREE.MathUtils.clamp(mesh.position.x, -halfWidth + radius, halfWidth - radius)
          velocity.x *= -0.7
        }
        if (mesh.position.y > halfHeight - radius || mesh.position.y < -halfHeight + radius) {
          mesh.position.y = THREE.MathUtils.clamp(mesh.position.y, -halfHeight + radius, halfHeight - radius)
          velocity.y *= -0.7
        }
      }

      for (let i = 0; i < stars.length; i += 1) {
        for (let j = i + 1; j < stars.length; j += 1) {
          const a = stars[i]
          const b = stars[j]
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
          const closingSpeed = (b.velocity.x - a.velocity.x) * nx + (b.velocity.y - a.velocity.y) * ny + (b.velocity.z - a.velocity.z) * nz
          if (closingSpeed < 0) {
            const impulse = -closingSpeed * 0.64
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
      group.rotation.z = Math.sin(time * 0.00012) * 0.015
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
      materials.forEach(material => material.dispose())
      renderer.dispose()
      mount.replaceChildren()
    }
  }, [])

  return <div ref={mountRef} className="hero-spheres" aria-label="Estrellas de vidrio interactivas" />
}
