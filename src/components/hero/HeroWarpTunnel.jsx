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
 * · Cada "radio" (spoke) alrededor del centro es UNA sola geometría de
 *   texto que contiene la palabra REPETIDA internamente muchas veces
 *   ("GLAMGLAMGLAMGLAM..."), construida como un único string antes de
 *   generar la geometría. Al ser un solo objeto rígido (no partículas
 *   independientes), es físicamente imposible que se vea "cortada" en
 *   palabras sueltas: el kerning de la fuente garantiza que las letras
 *   quedan pegadas de punta a punta, siempre.
 * · Esa tira larga se coloca radialmente (rotada en el plano XY según
 *   el ángulo del radio) y viaja como un bloque único a lo largo de Z
 *   hacia la cámara, con aceleración progresiva. Al cruzar la cámara,
 *   se recicla al fondo del túnel — el flujo es perpetuo.
 * · Post-proceso (EffectComposer + GLSL propio): Bloom, estela
 *   (afterimage), grano de película y un pase final que combina
 *   desenfoque de movimiento radial + aberración cromática.
 */

const WORDS = ['GLAM', 'LAB']
const SPOKE_COUNT = 16          // radios alrededor del centro
const REPEAT_COUNT = 40         // veces que se repite la palabra EN LA MISMA geometría
const MIN_RADIUS = 0.6          // hueco pequeño en el centro (punto de fuga)
const TUNNEL_DEPTH = 46
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
    const spokes = [] // { mesh, angle, speed, z }

    // ── Definición de los radios (spokes) ──────────────────────
    const spokeDefs = []
    for (let s = 0; s < SPOKE_COUNT; s++) {
      spokeDefs.push({
        angle: (s / SPOKE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.1,
        speed: 0.7 + Math.random() * 0.5,
        word: WORDS[s % WORDS.length],
        // arrancan repartidos en toda la profundidad, no todos juntos
        z0: THREE.MathUtils.lerp(-TUNNEL_DEPTH * 1.3, CAMERA_Z - 3, Math.random()),
      })
    }

    // ── Carga de fuente + construcción de las tiras de texto ───
    const loader = new FontLoader()
    let sharedMat = null
    loader.load(
      '/fonts/helvetiker_bold.typeface.json',
      (font) => {
        if (disposed) return

        sharedMat = new THREE.MeshBasicMaterial({
          color: RED,
          transparent: true,
          opacity: 0.95,
        })

        spokeDefs.forEach((spoke) => {
          // la palabra repetida MUCHAS veces en un solo string: el
          // propio kerning de la fuente pega las letras sin huecos
          const longText = spoke.word.repeat(REPEAT_COUNT)
          const geo = new TextGeometry(longText, {
            font,
            size: 1,
            depth: 0.28,
            curveSegments: 3,
            bevelEnabled: false,
          })
          geo.computeBoundingBox()
          // desplaza el arranque de la tira a MIN_RADIUS del centro,
          // dejando el punto de fuga limpio
          geo.translate(MIN_RADIUS - geo.boundingBox.min.x, 0, 0)

          const mesh = new THREE.Mesh(geo, sharedMat)
          mesh.rotation.z = spoke.angle   // orienta la tira a lo largo del radio
          mesh.position.z = spoke.z0
          scene.add(mesh)

          spokes.push({ mesh, angle: spoke.angle, speed: spoke.speed, z: spoke.z0 })
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
        spokes.forEach((spoke) => {
          let z = spoke.z

          // proximidad a la cámara → aceleración exponencial (warp speed)
          const proximity = THREE.MathUtils.clamp((z + TUNNEL_DEPTH) / TUNNEL_DEPTH, 0, 1)
          const accel = spoke.speed * (0.7 + Math.pow(proximity, 2.4) * 10)
          z += accel * dt * 5.5

          if (z > CAMERA_Z + 1.2) {
            // reciclado: la MISMA tira (un solo objeto, nunca se corta)
            // vuelve al fondo del túnel
            z = -TUNNEL_DEPTH * 1.3 - Math.random() * 4
          }

          spoke.z = z
          spoke.mesh.position.z = z
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
      spokes.forEach(({ mesh }) => {
        mesh.geometry.dispose()
      })
      if (sharedMat) sharedMat.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className="warp-tunnel" aria-label="Túnel de velocidad hiperespacial" />
}
