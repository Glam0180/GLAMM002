import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js'
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import './HeroWarpTunnel.css'

const WORDS = ['GLAM', 'LAB']
const TOTAL_COUNT = 120 // 100-150 legible, antes 320 ilegible
const RINGS = 10 // 10 anillos
const PER_RING = TOTAL_COUNT / RINGS // 12 por anillo = 30° separación
const FAR_BACK = 450
const TUNNEL_RADIUS = 11
const CAMERA_Z = 6
const TEXT_SIZE = 0.9
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

    let yaw = 0, pitch = 0, isDragging = false, lastX = 0, lastY = 0
    const onDown = (e) => { isDragging = true; const p = e.touches? e.touches[0] : e; lastX = p.clientX; lastY = p.clientY; renderer.domElement.style.cursor = 'grabbing' }
    const onMove = (e) => {
      if (!isDragging) return
      const p = e.touches? e.touches[0] : e
      yaw -= (p.clientX - lastX) * 0.003; pitch -= (p.clientY - lastY) * 0.003
      pitch = Math.max(-1.2, Math.min(1.2, pitch))
      camera.rotation.set(pitch, yaw, 0)
      lastX = p.clientX; lastY = p.clientY
    }
    const onUp = () => { isDragging = false; renderer.domElement.style.cursor = 'grab' }
    renderer.domElement.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    renderer.domElement.addEventListener('touchstart', onDown, { passive: false })
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)

    const RED = new THREE.Color('#FF0000')
    const strips = []
    const flowDir = new THREE.Vector3(0, 0, 1)
    const worldUp = new THREE.Vector3(0, 1, 0)
    const basisX = new THREE.Vector3(), basisY = new THREE.Vector3(), basisZ = new THREE.Vector3()
    const basisMatrix = new THREE.Matrix4(), flowQuat = new THREE.Quaternion()

    const spokes = []
    for (let ring = 0; ring < RINGS; ring++) {
      const baseZ = - (ring / RINGS) * FAR_BACK - 10
      for (let i = 0; i < PER_RING; i++) {
        const angleStep = (Math.PI * 2) / PER_RING
        const angle = i * angleStep + (Math.random() - 0.5) * 0.15
        const radialBand = (i % 3) / 3
        const radius = TUNNEL_RADIUS * (0.25 + radialBand * 0.6 + Math.random() * 0.1)
        spokes.push({
          angle, radius, z: baseZ - Math.random() * 10,
          speed: 0.9 + Math.random() * 0.3,
          word: WORDS[(ring + i) % WORDS.length],
          phase: Math.random() * Math.PI * 2,
        })
      }
    }

    function measurePeriod(font, word, size) {
      const build = (n) => {
        const shapes = font.generateShapes(word.repeat(n), size)
        const geo = new THREE.ShapeGeometry(shapes)
        geo.computeBoundingBox()
        const w = geo.boundingBox.max.x - geo.boundingBox.min.x
        geo.dispose(); return w
      }
      return build(4) - build(3)
    }

    const loader = new FontLoader()
    loader.load('/fonts/helvetiker_bold.typeface.json', (font) => {
      if (disposed) return
      WORDS.forEach((word) => {
        const period = measurePeriod(font, word, TEXT_SIZE)
        const totalNeeded = FAR_BACK + CAMERA_Z + 60
        const repeatCount = Math.ceil(totalNeeded / period) + 6
        const shapes = font.generateShapes(word.repeat(repeatCount), TEXT_SIZE)
        const geo = new THREE.ShapeGeometry(shapes, 4)
        geo.computeBoundingBox(); geo.translate(-geo.boundingBox.min.x, 0, 0)
        const mat = new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
        spokes.filter(sp => sp.word === word).forEach((spoke) => {
          const mesh = new THREE.Mesh(geo, mat)
          scene.add(mesh)
          strips.push({
            mesh, period, angle: spoke.angle, baseRadius: spoke.radius,
            baseZ: spoke.z, scrollOffset: Math.random() * period, speed: spoke.speed, phase: spoke.phase,
          })
        })
      })
      fontLoaded = true
    })

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1,1), 0.6, 0.4, 0.4))
    composer.addPass(new AfterimagePass(0.55))
    composer.addPass(new FilmPass(0.16, false))
    const warpShader = {
      uniforms: { tDiffuse: { value: null }, uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uStrength: { value: 0.15 }, uAberration: { value: 0.05 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uCenter; uniform float uStrength; uniform float uAberration; varying vec2 vUv; void main(){ vec2 dir=vUv-uCenter; float dist=length(dir); vec2 d=dist>0.0001?dir/dist:vec2(0.0); const int S=6; vec3 c=vec3(0.0); float t=0.0; for(int i=0;i<S;i++){ float f=float(i)/float(S-1); float sc=1.0-uStrength*dist*f; vec2 uv=uCenter+dir*sc; float w=1.0-f*0.4; c+=texture2D(tDiffuse,uv).rgb*w; t+=w; } c/=max(t,0.0001); float ab=uAberration*dist*dist; float r=texture2D(tDiffuse,uCenter+d*(dist-ab)).r; float b=texture2D(tDiffuse,uCenter+d*(dist+ab)).b; gl_FragColor=vec4(r,c.g,b,1.0); }`,
    }
    const warpPass = new ShaderPass(warpShader); warpPass.renderToScreen = true; composer.addPass(warpPass)

    function resize(){ const w=mount.clientWidth||1,h=mount.clientHeight||1; camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h); composer.setSize(w,h) }
    resize(); window.addEventListener('resize', resize)
    const clock = new THREE.Clock()

    function animate(){
      raf = requestAnimationFrame(animate)
      const dt = Math.min(clock.getDelta(), 0.05)
      if(fontLoaded){
        basisX.copy(flowDir); basisY.copy(worldUp).sub(basisX.clone().multiplyScalar(worldUp.dot(basisX))).normalize(); basisZ.crossVectors(basisX, basisY).normalize()
        basisMatrix.makeBasis(basisX, basisY, basisZ); flowQuat.setFromRotationMatrix(basisMatrix)
        strips.forEach((strip)=>{
          strip.scrollOffset += strip.speed * SCROLL_SPEED * dt
          strip.scrollOffset %= strip.period
          const currentZ = strip.baseZ + strip.scrollOffset
          if (currentZ > CAMERA_Z + 25) {
            strip.baseZ = -FAR_BACK - Math.random() * 60
            strip.scrollOffset = 0
          }
          const total = CAMERA_Z + FAR_BACK + 25
          const p = (currentZ + FAR_BACK) / total
          const expansion = 0.06 + 0.94 * Math.pow(p, 2.0)
          strip.mesh.position.set(Math.cos(strip.angle)*strip.baseRadius*expansion, Math.sin(strip.angle)*strip.baseRadius*expansion, currentZ)
          strip.mesh.quaternion.copy(flowQuat)
        })
      }
      composer.render()
    }
    animate()

    return()=>{
      disposed=true; cancelAnimationFrame(raf)
      window.removeEventListener('resize',resize)
      window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp)
      const g=new Set(); strips.forEach(({mesh})=>{ if(!g.has(mesh.geometry)){mesh.geometry.dispose(); g.add(mesh.geometry)} })
      renderer.dispose()
      if(mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  },[])

  return <div ref={mountRef} className="warp-tunnel" />
}
