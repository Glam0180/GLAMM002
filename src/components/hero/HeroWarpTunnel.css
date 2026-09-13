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

/*

WARP SPEED TUNNEL — túnel de velocidad hiperespacial de texto FLAT (2D),

estilo Matrix: UNA sola tira de texto continua por radio, sin cortes.



· TIRA ÚNICA (no instancias sueltas): en vez de repetir una palabra como

piezas independientes espaciadas "a ojo", se genera con

font.generateShapes() una única cadena larga ("GLAMGLAMGLAM...") de una

sola vez. Es el propio motor tipográfico el que calcula el avance entre

glyphs, así que no existe ningún hueco posible entre repeticiones — es

literalmente una sola pieza de geometría continua, no un colage.

· Cada radio (spoke) tiene su propia tira (mismo geometry compartido

entre spokes que usan la misma palabra, para eficiencia) que se desliza

a lo largo del eje de flujo. Al desplazarse exactamente un "período"

(el ancho medido de una repetición), se resetea silenciosamente: como

el patrón es idéntico, el salto es invisible → scroll infinito real.

· Trade-off consciente: al ser una tira RÍGIDA y continua, cada radio se

mueve a velocidad CONSTANTE (ya no acelera letra por letra cerca de la

cámara) — una tira sólida no puede estirarse sin separarse.



· Orientación del texto (vector de flujo) — SIN CAMBIOS:



Alineación con flowDir: el eje X local del bloque de texto



 (su eje longitudinal) se orienta siguiendo la trayectoria de



 vuelo, que va del fondo del túnel hacia la cámara.



Base ortogonal perpendicular (makeBasis / Gram-Schmidt): los



 ejes Y (alto) y Z (profundidad) del texto se recalculan cada



 frame perpendiculares a flowDir, para que el bloque nunca se



 retuerza de forma anómala.



· Post-proceso (EffectComposer + GLSL propio): Bloom, estela

(afterimage), grano de película y un pase final que combina

desenfoque de movimiento radial + aberración cromática.
*/

const WORDS = ['GLAM', 'LAB']
const SPOKE_COUNT = 16          // radios alrededor del centro
const TUNNEL_DEPTH = 46
const TUNNEL_RADIUS = 10.5
const CAMERA_Z = 6
const TEXT_SIZE = 1             // tamaño real y constante del texto (mundo, no visual)
const SCROLL_SPEED = 5.5        // multiplicador global de velocidad de scroll

export default function HeroWarpTunnel() {
const mountRef = useRef(null)

useEffect(() => {
const mount = mountRef.current
if (!mount) return

let raf = 0
let disposed = false
let fontLoaded = false

// ── Escena base ──────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000000)

const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 100)
camera.position.set(0, 0, CAMERA_Z)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
mount.appendChild(renderer.domElement)

const RED = new THREE.Color('#FF0000')
const strips = [] // { mesh, period, speed, baseZ, scrollOffset }

// ── Base ortogonal de orientación (vector de flujo) ─────────
// El flujo es puramente a lo largo de Z (fondo del túnel → cámara),
// así que flowDir es constante para todas las instancias. Se deja
// como vector reasignable por si en el futuro el movimiento deja
// de ser puramente radial-fijo (p. ej. drift en x/y).
const flowDir = new THREE.Vector3(0, 0, 1)
const worldUp = new THREE.Vector3(0, 1, 0)
const basisX = new THREE.Vector3()
const basisY = new THREE.Vector3()
const basisZ = new THREE.Vector3()
const basisMatrix = new THREE.Matrix4()
const flowQuat = new THREE.Quaternion()

// ── Definición de los radios (spokes) ──────────────────────
// Cada radio tiene ángulo, distancia al centro, velocidad y palabra
// fijos — así todas las instancias de un mismo radio avanzan
// sincronizadas y la hilera se mantiene continua.
const spokes = []
for (let s = 0; s < SPOKE_COUNT; s++) {
  const angle = (s / SPOKE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.12
  spokes.push({
    angle,
    radius: TUNNEL_RADIUS * (0.55 + Math.random() * 0.45),
    speed: 0.7 + Math.random() * 0.5,
    word: WORDS[s % WORDS.length],
  })
}

// Mide el período real (avance por repetición) generando dos longitudes
// de la misma cadena repetida y comparando sus anchos. Esto usa el MISMO
// motor de layout que la tira final, así que el valor coincide con
// exactitud — no depende de bounding boxes de tinta que puedan no
// coincidir con el avance tipográfico real.
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

// ── Carga de fuente + construcción de instancias ─────────
const loader = new FontLoader()
loader.load(
  '/fonts/helvetiker_bold.typeface.json',
  (font) => {
    if (disposed) return

    const totalSpan = TUNNEL_DEPTH * 1.4 + CAMERA_Z + 2

    WORDS.forEach((word) => {
      // Período exacto de una repetición, medido con el mismo motor
      // de layout que se usará para construir la tira real.
      const period = measurePeriod(font, word, TEXT_SIZE)

      // BASE_Z: dónde arranca la tira (con un período extra de colchón
      // detrás), y TOTAL: longitud mínima que la tira necesita tener
      // para, en el peor caso del scroll (offset = 0), seguir cubriendo
      // desde el fondo del túnel hasta más allá de la cámara.
      const baseZ = -TUNNEL_DEPTH * 1.4 - period
      const totalNeeded = (CAMERA_Z + 1.2) - baseZ
      const repeatCount = Math.ceil(totalNeeded / period) + 2

      // Texto FLAT: shapes 2D puros (sin extrusión ni bisel), generados
      // como UNA sola cadena larga repetida — el layout tipográfico
      // nativo garantiza cero huecos entre repeticiones.
      const shapes = font.generateShapes(word.repeat(repeatCount), TEXT_SIZE)
      const geo = new THREE.ShapeGeometry(shapes, 4)
      geo.computeBoundingBox()
      // Ancla el inicio de la tira en x = 0 para que el cálculo de
      // posición/scroll sea predecible.
      geo.translate(-geo.boundingBox.min.x, 0, 0)

      const mat = new THREE.MeshBasicMaterial({
        color: RED,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
      })

      const wordSpokes = spokes.filter((sp) => sp.word === word)
      wordSpokes.forEach((spoke) => {
        const mesh = new THREE.Mesh(geo, mat) // geometría y material compartidos entre spokes
        scene.add(mesh)
        strips.push({
          mesh,
          period,
          speed: spoke.speed,
          x: Math.cos(spoke.angle) * spoke.radius,
          y: Math.sin(spoke.angle) * spoke.radius,
          baseZ,
          scrollOffset: Math.random() * period, // desfase inicial para que no arranquen todas alineadas
        })
      })
    })

    fontLoaded = true
  },
  undefined,
  () => { /* si la fuente falla en cargar, el fondo negro queda como fallback silencioso */ }
)

// ── Post-procesado ────────────────────────────────────────
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))

const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.4, 0.2)
composer.addPass(bloomPass)

const afterimagePass = new AfterimagePass(0.55) // estela / trail
composer.addPass(afterimagePass)

const filmPass = new FilmPass(0.25, false) // grano de película
composer.addPass(filmPass)

// Pase final: desenfoque de movimiento radial + aberración cromática
const warpShader = {
  uniforms: {
    tDiffuse: { value: null },
    uCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uStrength: { value: 0.22 },
    uAberration: { value: 0.1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uCenter;
    uniform float uStrength;
    uniform float uAberration;
    varying vec2 vUv;

    void main() {
      vec2 dir = vUv - uCenter;
      float dist = length(dir);
      vec2 dirNorm = dist > 0.0001 ? dir / dist : vec2(0.0);

      const int SAMPLES = 6;
      vec3 col = vec3(0.0);
      float total = 0.0;
      for (int i = 0; i < SAMPLES; i++) {
        float t = float(i) / float(SAMPLES - 1);
        float scale = 1.0 - uStrength * dist * t;
        vec2 uv = uCenter + dir * scale;
        float w = 1.0 - t * 0.4;
        col += texture2D(tDiffuse, uv).rgb * w;
        total += w;
      }
      col /= max(total, 0.0001);

      float aberr = uAberration * dist * dist;
      float rr = texture2D(tDiffuse, uCenter + dirNorm * (dist - aberr)).r;
      float bb = texture2D(tDiffuse, uCenter + dirNorm * (dist + aberr)).b;

      gl_FragColor = vec4(rr, col.g, bb, 1.0);
    }
  `,
}
const warpPass = new ShaderPass(warpShader)
warpPass.renderToScreen = true
composer.addPass(warpPass)

// ── Resize ────────────────────────────────────────────────
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

// ── Loop de animación ────────────────────────────────────
const clock = new THREE.Clock()

function animate() {
  raf = requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)

  if (fontLoaded) {
    // La base ortogonal (flowDir → basisX/Y/Z → quaternion) es la
    // misma para TODAS las instancias este frame, porque el flujo es
    // uniformemente +Z. Se calcula una sola vez fuera del loop de
    // instancias en vez de recalcularla por cada una.
    basisX.copy(flowDir)
    basisY.copy(worldUp).sub(basisX.clone().multiplyScalar(worldUp.dot(basisX))).normalize()
    basisZ.crossVectors(basisX, basisY).normalize()
    basisMatrix.makeBasis(basisX, basisY, basisZ)
    flowQuat.setFromRotationMatrix(basisMatrix)

    strips.forEach((strip) => {
      // Scroll a velocidad constante: al ser una tira rígida y continua
      // (una sola geometría, sin cortes), no puede acelerar por tramos
      // sin separarse — cada radio avanza parejo según su propia
      // velocidad asignada.
      strip.scrollOffset += strip.speed * SCROLL_SPEED * dt
      // Wrap infinito: al desplazarse un período completo, el patrón
      // repetido se ve idéntico, así que el reseteo es invisible.
      strip.scrollOffset %= strip.period

      strip.mesh.position.set(strip.x, strip.y, strip.baseZ + strip.scrollOffset)
      // Orientación sin cambios: misma rotación (flowQuat) para todas.
      strip.mesh.quaternion.copy(flowQuat)
    })
  }

  composer.render()
}
animate()

// ── Cleanup ───────────────────────────────────────────────
return () => {
  disposed = true
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
  const disposedGeo = new Set()
  const disposedMat = new Set()
  strips.forEach(({ mesh }) => {
    // geometría y material se comparten entre spokes de la misma
    // palabra, así que cada uno se libera una sola vez.
    if (!disposedGeo.has(mesh.geometry)) {
      mesh.geometry.dispose()
      disposedGeo.add(mesh.geometry)
    }
    if (!disposedMat.has(mesh.material)) {
      mesh.material.dispose()
      disposedMat.add(mesh.material)
    }
  })
  renderer.dispose()
  if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
}

}, [])

return <div ref={mountRef} className="warp-tunnel" aria-label="Túnel de velocidad hiperespacial" />
}
