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
const SPOKE_COUNT = 35        // tu tenias 16, ahora 28 para mas lineas
const TUNNEL_DEPTH = 186         // igual que tu original
const TUNNEL_RADIUS = 7.5      // igual que tu original
const CAMERA_Z = 6              // igual
const TEXT_SIZE = 0.5             // igual
const SCROLL_SPEED = 3.5        // igual que tu original

export default function HeroWarpTunnel() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let raf = 0, disposed = false, fontLoaded = false

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 100)
    camera.position.set(0, 0, CAMERA_Z)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    mount.appendChild(renderer.domElement)

    const RED = new THREE.Color('#FF0000')
    const strips = []

    // ORIENTACION ORIGINAL - NO SE TOCA
    const flowDir = new THREE.Vector3(0, 0, 1)
    const worldUp = new THREE.Vector3(0, 1, 0)
    const basisX = new THREE.Vector3(), basisY = new THREE.Vector3(), basisZ = new THREE.Vector3()
    const basisMatrix = new THREE.Matrix4()
    const flowQuat = new THREE.Quaternion()

    const spokes = []
    for (let s = 0; s < SPOKE_COUNT; s++) {
      const angle = (s / SPOKE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.12
      spokes.push({
        angle,
        radius: TUNNEL_RADIUS * (0.55 + Math.random() * 0.45),
        speed: 0.7 + Math.random() * 0.5,
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
      const totalSpan = TUNNEL_DEPTH * 1.4 + CAMERA_Z + 2
      WORDS.forEach((word) => {
        const period = measurePeriod(font, word, TEXT_SIZE)
        const baseZ = -TUNNEL_DEPTH * 1.4 - period
        const totalNeeded = (CAMERA_Z + 1.2) - baseZ
        const repeatCount = Math.ceil(totalNeeded / period) + 2
        const shapes = font.generateShapes(word.repeat(repeatCount), TEXT_SIZE)
        const geo = new THREE.ShapeGeometry(shapes, 4)
        geo.computeBoundingBox()
        geo.translate(-geo.boundingBox.min.x, 0, 0)
        const mat = new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
        
        spokes.filter(sp => sp.word === word).forEach((spoke) => {
          const mesh = new THREE.Mesh(geo, mat)
          scene.add(mesh)
          strips.push({
            mesh, period, speed: spoke.speed,
            angle: spoke.angle, baseRadius: spoke.radius,
            baseZ, scrollOffset: Math.random() * period,
            phase: spoke.phase,
            x: Math.cos(spoke.angle) * spoke.radius,
            y: Math.sin(spoke.angle) * spoke.radius,
          })
        })
      })
      fontLoaded = true
    })

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.4, 0.2))
    composer.addPass(new AfterimagePass(0.65))
    composer.addPass(new FilmPass(0.25, false))

    const warpShader = {
      uniforms: {
        tDiffuse: { value: null },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uStrength: { value: 0.22 },
        uAberration: { value: 0.10 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform vec2 uCenter; uniform float uStrength; uniform float uAberration;
        varying vec2 vUv;
        void main(){
          vec2 dir = vUv - uCenter; float dist = length(dir);
          vec2 dirNorm = dist > 0.0001 ? dir/dist : vec2(0.0);
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
          strip.scrollOffset += strip.speed * SCROLL_SPEED * dt
          strip.scrollOffset %= strip.period
          const currentZ = strip.baseZ + strip.scrollOffset

          // --- EFECTOS PEDIDOS, SUTILES ---
          // 1. Apertura radial cilindrica
          const total = CAMERA_Z + TUNNEL_DEPTH * 1.4 + strip.period
          const p = (currentZ + TUNNEL_DEPTH*1.4 + strip.period) / total
          const expansion = 0.75 + 0.25 * Math.pow(p, 1.8)

          // 2. Jitter micro
          const jx = Math.sin(elapsed * 1.5 + strip.phase) * 0.04
          const jy = Math.cos(elapsed * 1.2 + strip.phase) * 0.04

          strip.mesh.position.set(
            Math.cos(strip.angle) * strip.baseRadius * expansion + jx,
            Math.sin(strip.angle) * strip.baseRadius * expansion + jy,
            currentZ
          )
          // 3. Orientacion original intacta
          strip.mesh.quaternion.copy(flowQuat)

          // 4. Velocity Stretch
          strip.mesh.scale.x = 1.0 + strip.speed * 0.35 * p
          strip.mesh.scale.y = 1.0
        })
      }
      composer.render()
    }
    animate()

    return()=>{
      disposed=true; cancelAnimationFrame(raf); window.removeEventListener('resize',resize)
      const g=new Set(); strips.forEach(({mesh})=>{ if(!g.has(mesh.geometry)){mesh.geometry.dispose(); g.add(mesh.geometry)} })
      renderer.dispose()
      if(mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  },[])

  return <div ref={mountRef} className="warp-tunnel" aria-label="Túnel de velocidad hiperespacial" />
}
