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
const SPOKE_COUNT = 64          // MAS LINEAS
const TUNNEL_DEPTH = 62
const TUNNEL_RADIUS = 14
const CAMERA_Z = 7
const TEXT_SIZE = 0.85          // un poco más pequeño para que entren más
const SCROLL_SPEED = 6.5
const STRETCH_FACTOR = 2.4      // Velocity / Tail Stretch
const JITTER_AMP = 0.28
const JITTER_FREQ = 2.2

export default function HeroWarpTunnel() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let raf = 0
    let disposed = false
    let fontLoaded = false

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)

    const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 100)
    camera.position.set(0, 0, CAMERA_Z)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    mount.appendChild(renderer.domElement)

    const RED = new THREE.Color('#FF0000')
    const strips = [] // { mesh, period, speed, baseZ, scrollOffset, angle, baseRadius, phase, mat }

    // Base ortogonal - NO CAMBIA ORIENTACION
    const flowDir = new THREE.Vector3(0, 0, 1)
    const worldUp = new THREE.Vector3(0, 1, 0)
    const basisX = new THREE.Vector3()
    const basisY = new THREE.Vector3()
    const basisZ = new THREE.Vector3()
    const basisMatrix = new THREE.Matrix4()
    const flowQuat = new THREE.Quaternion()

    // Radios con 3 anillos para densidad
    const spokes = []
    for (let s = 0; s < SPOKE_COUNT; s++) {
      const angle = (s / SPOKE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.15
      const ring = s % 3
      let radiusMin, radiusMax
      if (ring === 0) { radiusMin = 0.18; radiusMax = 0.45 }      // interior denso
      else if (ring === 1) { radiusMin = 0.5; radiusMax = 0.85 }  // medio
      else { radiusMin = 0.88; radiusMax = 1.15 }                // exterior
      spokes.push({
        angle,
        radius: TUNNEL_RADIUS * (radiusMin + Math.random() * (radiusMax - radiusMin)),
        speed: 0.6 + Math.random() * 1.1, // más variación para stretch
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
    loader.load(
      '/fonts/helvetiker_bold.typeface.json',
      (font) => {
        if (disposed) return
        const totalSpan = TUNNEL_DEPTH * 1.4 + CAMERA_Z + 2

        WORDS.forEach((word) => {
          const period = measurePeriod(font, word, TEXT_SIZE)
          const baseZ = -TUNNEL_DEPTH * 1.4 - period
          const totalNeeded = (CAMERA_Z + 1.2) - baseZ
          const repeatCount = Math.ceil(totalNeeded / period) + 3

          const shapes = font.generateShapes(word.repeat(repeatCount), TEXT_SIZE)
          const geo = new THREE.ShapeGeometry(shapes, 4)
          geo.computeBoundingBox()
          geo.translate(-geo.boundingBox.min.x, 0, 0)

          // Material base para clonar (necesitamos instancia por tira para opacity individual)
          const baseMat = new THREE.MeshBasicMaterial({
            color: RED,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide,
          })

          spokes.filter(sp => sp.word === word).forEach((spoke) => {
            const mat = baseMat.clone()
            const mesh = new THREE.Mesh(geo, mat)
            // escala inicial
            mesh.scale.set(1, 1, 1)
            scene.add(mesh)
            strips.push({
              mesh,
              mat,
              period,
              speed: spoke.speed,
              angle: spoke.angle,
              baseRadius: spoke.radius,
              baseZ,
              scrollOffset: Math.random() * period,
              phase: spoke.phase,
            })
          })
          // liberar baseMat, ya clonamos
          baseMat.dispose()
        })
        fontLoaded = true
      },
      undefined,
      () => {}
    )

    // Post-procesado
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.25, 0.6, 0.12)
    composer.addPass(bloomPass)

    const afterimagePass = new AfterimagePass(0.84)
    composer.addPass(afterimagePass)

    const filmPass = new FilmPass(0.18, 0.15, 1024, false)
    composer.addPass(filmPass)

    const warpShader = {
      uniforms: {
        tDiffuse: { value: null },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uStrength: { value: 0.35 },     // Radial Motion Blur más fuerte
        uAberration: { value: 0.18 },   // Anamórfica
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 uCenter;
        uniform float uStrength;
        uniform float uAberration;
        varying vec2 vUv;

        void main() {
          vec2 dir = vUv - uCenter;
          float dist = length(dir);
          vec2 dirNorm = dist > 0.0001 ? dir / dist : vec2(0.0);
          
          // --- Radial Motion Blur en estrella ---
          const int SAMPLES = 10;
          vec3 col = vec3(0.0);
          float total = 0.0;
          for (int i = 0; i < SAMPLES; i++) {
            float t = float(i) / float(SAMPLES - 1);
            // curva exponencial para más streak en bordes
            float scale = 1.0 - uStrength * pow(dist, 1.4) * t;
            vec2 uv = uCenter + dir * scale;
            float w = 1.0 - t * 0.5;
            col += texture2D(tDiffuse, uv).rgb * w;
            total += w;
          }
          col /= max(total, 0.0001);

          // --- Aberración Cromática Anamórfica ---
          // fantasma magenta/cian más ancho en X (anamórfico)
          float aberr = uAberration * pow(dist, 2.5);
          vec2 aberrVec = dirNorm * aberr;
          aberrVec.x *= 1.6; // stretch horizontal anamórfico

          float r = texture2D(tDiffuse, vUv - aberrVec).r;
          float b = texture2D(tDiffuse, vUv + aberrVec).b;
          // g se queda en el blur central

          // vignette sutil para reforzar túnel
          float vignette = 1.0 - dist * 0.35;
          
          gl_FragColor = vec4(r, col.g, b, 1.0) * vignette;
        }
      `,
    }
    const warpPass = new ShaderPass(warpShader)
    warpPass.renderToScreen = true
    composer.addPass(warpPass)

    function resize() {
      const w = mount.clientWidth || 1
      const h = mount.clientHeight || 1
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      composer.setSize(w, h)
    }
    resize()
    window.addEventListener('resize', resize)

    const clock = new THREE.Clock()

    function animate() {
      raf = requestAnimationFrame(animate)
      const dt = Math.min(clock.getDelta(), 0.05)
      const elapsed = clock.getElapsedTime()

      if (fontLoaded) {
        // ORIENTACION INTACTA - misma base para todas
        basisX.copy(flowDir)
        basisY.copy(worldUp).sub(basisX.clone().multiplyScalar(worldUp.dot(basisX))).normalize()
        basisZ.crossVectors(basisX, basisY).normalize()
        basisMatrix.makeBasis(basisX, basisY, basisZ)
        flowQuat.setFromRotationMatrix(basisMatrix)

        strips.forEach((strip) => {
          strip.scrollOffset += strip.speed * SCROLL_SPEED * dt
          strip.scrollOffset %= strip.period

          const currentZ = strip.baseZ + strip.scrollOffset

          // 1. Apertura Radial Cilíndrica: de compacto en centro a expandido
          const totalDepth = CAMERA_Z + TUNNEL_DEPTH * 1.4 + strip.period
          const radialProgress = THREE.MathUtils.clamp((currentZ + TUNNEL_DEPTH * 1.4 + strip.period) / totalDepth, 0, 1)
          const expansion = 0.12 + 0.88 * Math.pow(radialProgress, 1.85)

          // 2. Jitter - dispersión caótica ortogonal
          const jitterX = Math.sin(elapsed * JITTER_FREQ + strip.phase) * JITTER_AMP * expansion
          const jitterY = Math.cos(elapsed * JITTER_FREQ * 1.3 + strip.phase * 1.7) * JITTER_AMP * expansion

          const finalRadius = strip.baseRadius * expansion
          const x = Math.cos(strip.angle) * finalRadius + jitterX
          const y = Math.sin(strip.angle) * finalRadius + jitterY

          strip.mesh.position.set(x, y, currentZ)
          strip.mesh.quaternion.copy(flowQuat)

          // 3. Velocity / Tail Stretch - aguja de luz
          const stretch = 1.0 + strip.speed * STRETCH_FACTOR * (0.4 + radialProgress * 1.6)
          strip.mesh.scale.x = stretch
          // ligero squash en Y para efecto proyectil, sin perder legibilidad
          strip.mesh.scale.y = THREE.MathUtils.clamp(1.1 - stretch * 0.08, 0.65, 1.0)

          // fade: nacen tenues en el centro, brillo total cerca de cámara
          strip.mat.opacity = THREE.MathUtils.clamp(0.15 + Math.pow(radialProgress, 0.9) * 0.9, 0, 1)
        })
        
        // Bloom dinámico según velocidad promedio (más sensación de warp)
        bloomPass.strength = 1.15 + Math.sin(elapsed * 0.8) * 0.15
      }

      composer.render()
    }
    animate()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      const disposedGeo = new Set()
      strips.forEach(({ mesh }) => {
        if (!disposedGeo.has(mesh.geometry)) {
          mesh.geometry.dispose()
          disposedGeo.add(mesh.geometry)
        }
        mesh.material.dispose()
      })
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className="warp-tunnel" aria-label="Túnel de velocidad hiperespacial" />
}
