import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import './HeroWarpTunnel.css'

const WORDS = ['GLAM', 'LAB']
const TOTAL = 120 // legible - si quieres 150 cambia a 150
const RINGS = 10
const PER_RING = TOTAL / RINGS // 12 por anillo = 30° de separación
const FAR_BACK = 450
const TUNNEL_RADIUS = 11
const CAMERA_Z = 6
const SCROLL_SPEED = 3.8 // equilibrado

export default function HeroWarpTunnel() {
  const mountRef = useRef(null)
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let raf = 0, disposed = false, fontLoaded = false

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)

    const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 800)
    camera.position.set(0, 0, CAMERA_Z)
    camera.rotation.order = 'YXZ'

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setClearColor(0x000000, 1)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.domElement.style.cursor = 'grab'
    mount.appendChild(renderer.domElement)

    // rotación en su propio eje
    let yaw = 0, pitch = 0, dragging = false, lastX = 0, lastY = 0
    const down = (e) => { dragging = true; const p = e.touches? e.touches[0]: e; lastX = p.clientX; lastY = p.clientY }
    const move = (e) => {
      if(!dragging) return
      const p = e.touches? e.touches[0]: e
      yaw -= (p.clientX - lastX) * 0.003
      pitch -= (p.clientY - lastY) * 0.003
      pitch = Math.max(-1.2, Math.min(1.2, pitch))
      camera.rotation.set(pitch, yaw, 0)
      lastX = p.clientX; lastY = p.clientY
    }
    const up = () => dragging = false
    renderer.domElement.addEventListener('mousedown', down)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    renderer.domElement.addEventListener('touchstart', down, {passive:false})
    window.addEventListener('touchmove', move, {passive:false})
    window.addEventListener('touchend', up)

    const strips = []
    const spokes = []
    for(let ring=0; ring<RINGS; ring++){
      const baseZ = - (ring / RINGS) * FAR_BACK - 10
      for(let i=0; i<PER_RING; i++){
        const angle = (i / PER_RING) * Math.PI*2 + (Math.random()-0.5)*0.15
        const radius = TUNNEL_RADIUS * (0.25 + (i%3)/3 * 0.6 + Math.random()*0.1)
        spokes.push({ angle, radius, z: baseZ - Math.random()*10, speed: 0.9 + Math.random()*0.3, word: WORDS[(ring+i)%WORDS.length] })
      }
    }

    const loader = new FontLoader()
    loader.load('/fonts/helvetiker_bold.typeface.json', (font) => {
      if(disposed) return
      const getPeriod = (word) => {
        const s1 = font.generateShapes(word.repeat(3), 0.9)
        const g1 = new THREE.ShapeGeometry(s1); g1.computeBoundingBox(); const w1 = g1.boundingBox.max.x - g1.boundingBox.min.x; g1.dispose()
        const s2 = font.generateShapes(word.repeat(4), 0.9)
        const g2 = new THREE.ShapeGeometry(s2); g2.computeBoundingBox(); const w2 = g2.boundingBox.max.x - g2.boundingBox.min.x; g2.dispose()
        return w2 - w1
      }

      WORDS.forEach(word => {
        const period = getPeriod(word)
        const repeat = Math.ceil((FAR_BACK + 60) / period) + 6
        const shapes = font.generateShapes(word.repeat(repeat), 0.9) // texto continuo
        const geo = new THREE.ShapeGeometry(shapes, 4)
        geo.computeBoundingBox(); geo.translate(-geo.boundingBox.min.x, 0, 0)
        const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide })

        spokes.filter(s => s.word === word).forEach(sp => {
          const mesh = new THREE.Mesh(geo, mat)
          scene.add(mesh)
          strips.push({ mesh, period, angle: sp.angle, baseRadius: sp.radius, baseZ: sp.z, offset: Math.random()*period, speed: sp.speed })
        })
      })
      fontLoaded = true
    })

    function resize(){ const w=mount.clientWidth||1, h=mount.clientHeight||1; camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h) }
    resize(); window.addEventListener('resize', resize)
    const clock = new THREE.Clock()

    function animate(){
      raf = requestAnimationFrame(animate)
      const dt = Math.min(clock.getDelta(), 0.05)
      if(fontLoaded){
        strips.forEach(s => {
          s.offset = (s.offset + s.speed * SCROLL_SPEED * dt) % s.period
          let curZ = s.baseZ + s.offset
          if(curZ > CAMERA_Z + 25){ s.baseZ = -FAR_BACK - Math.random()*60; s.offset = 0; curZ = s.baseZ }
          const p = (curZ + FAR_BACK) / (CAMERA_Z + FAR_BACK + 25)
          const exp = 0.06 + 0.94 * Math.pow(p, 2)
          s.mesh.position.set(Math.cos(s.angle)*s.baseRadius*exp, Math.sin(s.angle)*s.baseRadius*exp, curZ)
          s.mesh.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0), Math.PI/2) // mira al frente
        })
      }
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      disposed = true; cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up)
      strips.forEach(({mesh}) => mesh.geometry.dispose())
      renderer.dispose()
      if(mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className="warp-tunnel" style={{width:'100%', height:'100vh', background:'#000'}} />
}
