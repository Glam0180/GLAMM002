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
const SPOKE_COUNT = 180 // mucha mas cantidad
const TUNNEL_DEPTH = 90 // mas profundo para ver lejos
const TUNNEL_RADIUS = 11
const CAMERA_Z = 6
const TEXT_SIZE = 0.9
const SCROLL_SPEED = 12 // mas rapido para que te pasen por la camara

export default function HeroWarpTunnel() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let raf = 0, disposed = false, fontLoaded = false

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)

    const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 150)
    camera.position.set(0, 0, CAMERA_Z)
    camera.rotation.order = 'YXZ'

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setClearColor(0x000000, 1)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.domElement.style.cursor = 'grab'
    mount.appendChild(renderer.domElement)

    // CAMARA SOLO ROTACION
    let yaw = 0, pitch = 0, isDragging = false, lastX = 0, lastY = 0
    const onDown = (e) => {
      isDragging = true
      const p = e.touches? e.touches[0] : e
      lastX = p.clientX; lastY = p.clientY
      renderer.domElement.style.cursor = 'grabbing'
    }
    const onMove = (e) => {
      if (!isDragging) return
      const p = e.touches? e.touches[0] : e
      yaw -= (p.clientX - lastX) * 0.003
      pitch -= (p.clientY - lastY) * 0.003
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

    // DISTRIBUCION: mas densidad a lo lejos (cerca del centro)
    const spokes = []
    for (let s = 0; s < SPOKE_COUNT; s++) {
      const angle = Math.random() * Math.PI * 2
      // pow 2.2 = muchas mas cerca del centro = se ven a lo lejos bien denso
      const radius = TUNNEL_RADIUS * (0.08 + 0.92 * Math.pow(Math.random(), 2.2))
      const z = -Math.random() * TUNNEL_DEPTH * 1.5 - 5
      spokes.push({
        angle,
        radius,
        z,
        speed: 0.8 + Math.random() * 1.8,
        word: WORDS[s % WORDS.length],
        phase: Math.random() * Math.PI * 2,
      })
    }

    function measurePeriod(font, word, size) {
      const build = (n) => {
        const shapes = font.generateShapes(word.repeat(n), size)
        const geo = new THREE.ShapeGeometry(shapes)
        geo.computeBoundingBox()
        const w = geo.boundingBox.max.x - geo.boundingBox.min.x
        geo.dispose()
        return w
      }
      return build(4) - build(3)
    }

    const loader = new FontLoader()
    loader.load('/fonts/helvetiker_bold.typeface.json', (font) => {
      if (disposed) return
      WORDS.forEach((word) => {
        const period = measurePeriod(font, word, TEXT_SIZE)
        const shapes = font.generateShapes(word.repeat(3), TEXT_SIZE) // tira corta, no hace falta larga
        const geo = new THREE.ShapeGeometry(shapes, 4)
        geo.computeBoundingBox()
        geo.translate(-geo.boundingBox.min.x, 0, 0)
        const mat = new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.95, side: THREE.DoubleSide })

        spokes.filter(sp => sp.word === word).forEach((spoke) => {
          const mesh = new THREE.Mesh(geo, mat)
          scene.add(mesh)
          strips.push({
            mesh,
            angle: spoke.angle,
            baseRadius: spoke.radius,
            z: spoke.z,
            speed: spoke.speed,
            phase: spoke.phase,
          })
        })
      })
      fontLoaded = true
    })

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1,1), 0.85, 0.4, 0.2))
    composer.addPass(new AfterimagePass(0.6))
    composer.addPass(new FilmPass(0.22, false))

    const warpShader = {
      uniforms: {
        tDiffuse: { value: null },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uStrength: { value: 0.22 },
        uAberration: { value: 0.08 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform vec2 uCenter; uniform float uStrength; uniform float uAberration;
        varying vec2 vUv;
        void main(){
          vec2 dir = vUv - uCenter; float dist = length(dir);
          vec2 dirNorm = dist > 0.0001? dir/dist : vec2(0.0);
          const int SAMPLES = 6; vec3 col = vec3(0.0); float total=0.0;
          for(int i=0;i<SAMPLES;i++){
            float t=float(i)/float(SAMPLES-1);
            float scale=1.0 - uStrength * dist * t;
            vec2 uv = uCenter + dir * scale; float w=1.0 - t*0.4;
            col+=texture2D(tDiffuse,uv).rgb*w; total+=w;
          }
          col/=max(total,0.0001);
          float aberr = uAberration * dist * dist;
          float rr = texture2D(tDiffuse, uCenter + dirNorm*(dist-aberr)).r;
          float bb = texture2D(tDiffuse, uCenter + dirNorm*(dist+aberr)).b;
          gl_FragColor = vec4(rr, col.g, bb, 1.0);
        }
      `,
    }
    const warpPass = new ShaderPass(warpShader)
    warpPass.renderToScreen = true
    composer.addPass(warpPass)

    function resize(){ const w=mount.clientWidth||1,h=mount.clientHeight||1; camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h); composer.setSize(w,h) }
    resize(); window.addEventListener('resize', resize)
    const clock = new THREE.Clock()

    function animate(){
      raf = requestAnimationFrame(animate)
      const dt = Math.min(clock.getDelta(), 0.05)
      const elapsed = clock.getElapsedTime()

      if(fontLoaded){
        basisX.copy(flowDir)
        basisY.copy(worldUp).sub(basisX.clone().multiplyScalar(worldUp.dot(basisX))).normalize()
        basisZ.crossVectors(basisX, basisY).normalize()
        basisMatrix.makeBasis(basisX, basisY, basisZ)
        flowQuat.setFromRotationMatrix(basisMatrix)

        strips.forEach((strip)=>{
          // AVANZA Y PASA POR LA CAMARA
          strip.z += strip.speed * SCROLL_SPEED * dt
          if (strip.z > CAMERA_Z + 15) {
            strip.z = -TUNNEL_DEPTH * 1.5 - Math.random() * 20
            strip.baseRadius = TUNNEL_RADIUS * (0.08 + 0.92 * Math.pow(Math.random(), 2.2))
            strip.angle = Math.random() * Math.PI * 2
          }

          const total = CAMERA_Z + TUNNEL_DEPTH * 1.5 + 15
          const p = (strip.z + TUNNEL_DEPTH * 1.5) / total
          const expansion = 0.08 + 0.92 * Math.pow(p, 1.7) // a lo lejos bien chico en el centro

          const jx = Math.sin(elapsed * 1.2 + strip.phase) * 0.06
          const jy = Math.cos(elapsed * 1.0 + strip.phase) * 0.06

          strip.mesh.position.set(
            Math.cos(strip.angle) * strip.baseRadius * expansion + jx,
            Math.sin(strip.angle) * strip.baseRadius * expansion + jy,
            strip.z
          )
          strip.mesh.quaternion.copy(flowQuat)

          // Tail stretch cuando pasa cerca
          const tail = 1.0 + p * 2.5
          strip.mesh.scale.x = tail
        })
      }
      composer.render()
    }
    animate()

    return()=>{
      disposed=true; cancelAnimationFrame(raf)
      window.removeEventListener('resize',resize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const g=new Set(); strips.forEach(({mesh})=>{ if(!g.has(mesh.geometry)){mesh.geometry.dispose(); g.add(mesh.geometry)} })
      renderer.dispose()
      if(mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  },[])

  return <div ref={mountRef} className="warp-tunnel" />
}
