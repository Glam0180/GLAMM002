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

// Palabras de tu referencia
const WORDS = ['GLOW', 'SPACE', 'FUTURE', 'LIGHT', 'SPEED', 'GLAM', 'LAB']
const SPOKE_COUNT = 32          // como en la foto, 32 radios
const TUNNEL_DEPTH = 65
const TUNNEL_RADIUS = 9
const CAMERA_Z = 6
const TEXT_SIZE = 0.55
const SCROLL_SPEED = 2.2        // LENTO como en la foto

export default function HeroWarpTunnel() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let raf = 0, disposed = false, fontLoaded = false

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100)
    camera.position.set(0, 0, CAMERA_Z)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    mount.appendChild(renderer.domElement)

    const RED = new THREE.Color('#FF0000')
    const strips = []

    // Radios en estrella como en tu imagen
    const spokes = []
    for (let s = 0; s < SPOKE_COUNT; s++) {
      const angle = (s / SPOKE_COUNT) * Math.PI * 2
      spokes.push({
        angle,
        radius: TUNNEL_RADIUS * (0.9 + Math.random() * 0.2),
        speed: 0.8 + Math.random() * 0.6,
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
        const baseZ = -TUNNEL_DEPTH - period
        const totalNeeded = (CAMERA_Z + 2) - baseZ
        const repeatCount = Math.ceil(totalNeeded / period) + 4

        const shapes = font.generateShapes(word.repeat(repeatCount), TEXT_SIZE)
        const geo = new THREE.ShapeGeometry(shapes)
        geo.computeBoundingBox()
        geo.translate(-geo.boundingBox.min.x, 0, 0)

        const mat = new THREE.MeshBasicMaterial({
          color: RED, transparent: true, opacity: 0.95, side: THREE.DoubleSide
        })

        spokes.filter(s => s.word === word).forEach((spoke) => {
          const mesh = new THREE.Mesh(geo, mat)
          scene.add(mesh)
          strips.push({
            mesh, period, speed: spoke.speed,
            angle: spoke.angle, baseRadius: spoke.radius,
            baseZ, scrollOffset: Math.random() * period,
          })
        })
      })
      fontLoaded = true
    })

    // Post-proceso sutil para que se vea crisp como en tu foto
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1,1), 0.6, 0.3, 0.25))
    composer.addPass(new AfterimagePass(0.75))
    composer.addPass(new FilmPass(0.08, false))

    const warpShader = {
      uniforms: {
        tDiffuse: { value: null },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uStrength: { value: 0.12 },
        uAberration: { value: 0.04 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform vec2 uCenter; uniform float uStrength; uniform float uAberration;
        varying vec2 vUv;
        void main(){
          vec2 dir = vUv - uCenter; float dist = length(dir);
          vec2 dirNorm = dist > 0.0001 ? dir/dist : vec2(0.0);
          // blur radial muy suave
          vec3 col = texture2D(tDiffuse, vUv).rgb;
          float aberr = uAberration * dist * dist;
          float r = texture2D(tDiffuse, vUv - dirNorm*aberr).r;
          float b = texture2D(tDiffuse, vUv + dirNorm*aberr).b;
          gl_FragColor = vec4(r, col.g, b, 1.0);
        }
      `,
    }
    const warpPass = new ShaderPass(warpShader)
    warpPass.renderToScreen = true
    composer.addPass(warpPass)

    function resize(){
      const w = mount.clientWidth||1, h = mount.clientHeight||1
      camera.aspect = w/h; camera.updateProjectionMatrix()
      renderer.setSize(w,h); composer.setSize(w,h)
    }
    resize(); window.addEventListener('resize', resize)
    const clock = new THREE.Clock()

    function animate(){
      raf = requestAnimationFrame(animate)
      const dt = Math.min(clock.getDelta(), 0.05)

      if(fontLoaded){
        strips.forEach((strip)=>{
          strip.scrollOffset += strip.speed * SCROLL_SPEED * dt
          strip.scrollOffset %= strip.period
          const currentZ = strip.baseZ + strip.scrollOffset

          // Progreso 0 = fondo (centro) 1 = camara (borde)
          const total = CAMERA_Z + TUNNEL_DEPTH + strip.period
          const p = THREE.MathUtils.clamp((currentZ + TUNNEL_DEPTH + strip.period) / total, 0, 1)
          
          // Apertura exponencial como en tu foto: nace compacto en el centro
          const expansion = Math.pow(p, 2.2) 
          const finalRadius = strip.baseRadius * expansion

          const x = Math.cos(strip.angle) * finalRadius
          const y = Math.sin(strip.angle) * finalRadius

          strip.mesh.position.set(x, y, currentZ)
          
          // ORIENTACION RADIAL - el texto mira hacia afuera como en la foto
          strip.mesh.rotation.z = strip.angle
          
          // Escala crece exponencial hacia el borde
          const scale = 0.05 + p * 4.5
          const stretch = 1.0 + strip.speed * 0.25 * p // Velocity Stretch sutil
          strip.mesh.scale.set(scale * stretch, scale, 1)

          // Siempre mirando a camara
          strip.mesh.lookAt(camera.position)
          // Corrige el lookAt para mantener radial
          strip.mesh.rotateZ(strip.angle)
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

  return <div ref={mountRef} className="warp-tunnel" />
}
