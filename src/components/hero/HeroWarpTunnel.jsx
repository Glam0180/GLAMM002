import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js'
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import './HeroWarpTunnel.css'

/*
 * WARP SPEED TUNNEL — túnel de velocidad hiperespacial de texto 3D.
 *
 * · InstancedMesh: cada palabra es UNA geometría (TextGeometry) dibujada
 *   cientos de veces en un solo draw call, cada instancia con su propia
 *   matriz de transformación (posición / rotación / escala).
 * · Las instancias se agrupan en "radios" (spokes) fijos alrededor del
 *   centro: dentro de cada radio, las repeticiones de la palabra viajan
 *   una detrás de otra a la MISMA velocidad, formando una hilera continua
 *   e ininterrumpida de texto que fluye hacia la cámara. Al reciclarse,
 *   cada instancia vuelve a engancharse justo detrás de la última de su
 *   propio radio (no a una posición aleatoria), así la hilera nunca se
 *   corta: el flujo es perpetuo.
 * · Post-proceso (EffectComposer + GLSL propio): Bloom, estela
 *   (afterimage), grano de película y un pase final que combina
 *   desenfoque de movimiento radial + aberración cromática.
 */

const WORDS = ['GLAM', 'LAB']
const SPOKE_COUNT = 16          // radios alrededor del centro
const TUNNEL_DEPTH = 46
const TUNNEL_RADIUS = 10.5
const CAMERA_Z = 6

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
    const dummy = new THREE.Object3D()
    const meshes = [] // { mesh, data(Float32Array), count, tailZ(Float32Array por radio) }

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

    // data por instancia: [x, y, z, spokeIndex]
    function seedChain(data, spokeIndexInWord, spoke, count, spacing) {
      for (let k = 0; k < count; k++) {
        const idx = k * 4
        const x = Math.cos(spoke.angle) * spoke.radius
        const y = Math.sin(spoke.angle) * spoke.radius
        data[idx + 0] = x
        data[idx + 1] = y
        // distribuidas de una vez a lo largo de TODA la profundidad,
        // ya en fila, para que se vea poblado y continuo desde el frame 1
        data[idx + 2] = -TUNNEL_DEPTH * 1.4 + k * spacing
        data[idx + 3] = spokeIndexInWord
      }
    }

    // ── Carga de fuente + construcción de instancias ─────────
    const loader = new FontLoader()
    loader.load(
      '/fonts/helvetiker_bold.typeface.json',
      (font) => {
        if (disposed) return

        WORDS.forEach((word) => {
          const geo = new TextGeometry(word, {
            font,
            size: 1,
            depth: 0.28,
            curveSegments: 3,
            bevelEnabled: false,
          })
          geo.computeBoundingBox()
          // ancho real de la palabra ya renderizada: usado como paso de
          // repetición exacto, así quedan pegadas letra-con-letra
          // ("GLAMGLAMGLAM..."), sin huecos ni superposición
          const wordWidth = geo.boundingBox.max.x - geo.boundingBox.min.x
          const spacing = wordWidth
          geo.center()

          const mat = new THREE.MeshBasicMaterial({
            color: RED,
            transparent: true,
            opacity: 0.95,
          })

          const wordSpokes = spokes.filter((sp) => sp.word === word)
          // suficientes repeticiones para cubrir TODO el túnel con este paso,
          // sin dejar huecos al final de la hilera
          const totalSpan = TUNNEL_DEPTH * 1.4 + CAMERA_Z + 2
          const instancesPerSpoke = Math.ceil(totalSpan / spacing) + 4
          const count = wordSpokes.length * instancesPerSpoke

          const mesh = new THREE.InstancedMesh(geo, mat, count)
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
          scene.add(mesh)

          const data = new Float32Array(count * 4)
          const tailZ = new Float32Array(wordSpokes.length)

          wordSpokes.forEach((spoke, spokeIndexInWord) => {
            const offset = spokeIndexInWord * instancesPerSpoke
            const chainData = new Float32Array(instancesPerSpoke * 4)
            seedChain(chainData, spokeIndexInWord, spoke, instancesPerSpoke, spacing)
            data.set(chainData, offset * 4)
            // cola inicial: justo detrás de la última instancia sembrada
            tailZ[spokeIndexInWord] = -TUNNEL_DEPTH * 1.4 - spacing
          })

          meshes.push({ mesh, data, count, wordSpokes, tailZ, spacing })
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
        meshes.forEach(({ mesh, data, count, wordSpokes, tailZ, spacing }) => {
          for (let i = 0; i < count; i++) {
            const idx = i * 4
            let z = data[idx + 2]
            const spokeIndexInWord = data[idx + 3]
            const spoke = wordSpokes[spokeIndexInWord]
            const speed = spoke.speed

            // proximidad a la cámara → aceleración exponencial
            // (misma fórmula para todas las instancias de un radio,
            // así conservan su orden y la hilera no se rompe)
            const proximity = THREE.MathUtils.clamp(
              (z + TUNNEL_DEPTH) / TUNNEL_DEPTH, 0, 1
            )
            const accel = speed * (0.7 + Math.pow(proximity, 2.4) * 10)
            z += accel * dt * 5.5

            if (z > CAMERA_Z + 1.2) {
              // reciclado continuo: se engancha justo detrás de la última
              // instancia de SU propio radio, nunca a una posición suelta
              z = tailZ[spokeIndexInWord]
              tailZ[spokeIndexInWord] -= spacing
            }
            data[idx + 2] = z

            const scaleT = THREE.MathUtils.clamp((z + TUNNEL_DEPTH) / TUNNEL_DEPTH, 0, 1)
            const scale = 0.5 + scaleT * 1.1

            dummy.position.set(data[idx], data[idx + 1], z)
            dummy.rotation.set(0, 0, spoke.angle)
            dummy.scale.setScalar(scale)
            dummy.updateMatrix()
            mesh.setMatrixAt(i, dummy.matrix)
          }
          mesh.instanceMatrix.needsUpdate = true
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
      meshes.forEach(({ mesh }) => {
        mesh.geometry.dispose()
        mesh.material.dispose()
      })
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className="warp-tunnel" aria-label="Túnel de velocidad hiperespacial" />
}
