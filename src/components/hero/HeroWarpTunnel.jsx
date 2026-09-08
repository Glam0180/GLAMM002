```jsx
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js'
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import './HeroWarpTunnel.css'

/*
 * WARP SPEED TUNNEL — FLAT GLAM LOOP
 *
 * · GLAM se repite continuamente:
 *
 *   GLAMGLAMGLAMGLAMGLAMGLAMGLAM...
 *
 * · Cada repetición utiliza el ancho real de GLAM como spacing,
 *   por lo que las palabras quedan pegadas entre sí.
 *
 * · El texto ahora es FLAT:
 *   depth: 0
 *   bevelEnabled: false
 *
 * · Se elimina completamente UnrealBloomPass.
 *   No hay Glow / Bloom.
 *
 * · LA ORIENTACIÓN ORIGINAL SE CONSERVA:
 *   flowDir → basisMatrix → flowQuat
 *
 * · Las instancias continúan distribuidas en radios alrededor
 *   del túnel y avanzando por Z hacia la cámara.
 *
 * · Al superar la cámara, cada GLAM se recicla exactamente
 *   detrás de la última instancia de su propio radio.
 *
 * · Se conserva Tail Stretch + apertura de perspectiva original.
 */

const WORDS = ['GLAM']

const SPOKE_COUNT = 16
const TUNNEL_DEPTH = 46
const TUNNEL_RADIUS = 10.5
const CAMERA_Z = 6
const TAIL_STRETCH = 1.8
const OPEN_AMOUNT = 0.6

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

    const camera = new THREE.PerspectiveCamera(
      62,
      1,
      0.1,
      100
    )

    camera.position.set(0, 0, CAMERA_Z)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
    })

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 2)
    )

    mount.appendChild(renderer.domElement)

    const RED = new THREE.Color('#FF0000')

    const dummy = new THREE.Object3D()

    const meshes = []

    // ── Base ortogonal de orientación ────────────────────────
    //
    // IMPORTANTE:
    // Esta parte se mantiene igual que en tu código original.
    // NO se modifica la orientación del texto.
    //

    const flowDir = new THREE.Vector3(0, 0, 1)
    const worldUp = new THREE.Vector3(0, 1, 0)

    const basisX = new THREE.Vector3()
    const basisY = new THREE.Vector3()
    const basisZ = new THREE.Vector3()

    const basisMatrix = new THREE.Matrix4()
    const flowQuat = new THREE.Quaternion()

    // ── Definición de los radios ─────────────────────────────

    const spokes = []

    for (let s = 0; s < SPOKE_COUNT; s++) {
      const angle =
        (s / SPOKE_COUNT) * Math.PI * 2 +
        (Math.random() - 0.5) * 0.12

      spokes.push({
        angle,
        radius:
          TUNNEL_RADIUS *
          (0.55 + Math.random() * 0.45),

        speed:
          0.7 + Math.random() * 0.5,

        // TODOS los radios utilizan GLAM.
        word: 'GLAM',
      })
    }

    // ── Cadena continua ─────────────────────────────────────

    function seedChain(
      data,
      spokeIndexInWord,
      spoke,
      count,
      spacing
    ) {
      for (let k = 0; k < count; k++) {
        const idx = k * 4

        const x =
          Math.cos(spoke.angle) *
          spoke.radius

        const y =
          Math.sin(spoke.angle) *
          spoke.radius

        data[idx + 0] = x
        data[idx + 1] = y

        /*
         * Cada GLAM se coloca exactamente después
         * del anterior usando el ancho real de GLAM.
         *
         * GLAMGLAMGLAMGLAMGLAM
         */
        data[idx + 2] =
          -TUNNEL_DEPTH * 1.4 +
          k * spacing

        data[idx + 3] =
          spokeIndexInWord
      }
    }

    // ── Carga de fuente + construcción ──────────────────────

    const loader = new FontLoader()

    loader.load(
      '/fonts/helvetiker_bold.typeface.json',

      (font) => {
        if (disposed) return

        WORDS.forEach((word) => {

          /*
           * TEXTO FLAT
           *
           * La orientación NO cambia.
           *
           * Solamente eliminamos la profundidad.
           */
          const geo = new TextGeometry(word, {
            font,
            size: 1,

            // ANTES: 0.28
            // AHORA: completamente flat
            depth: 0,

            curveSegments: 3,
            bevelEnabled: false,
          })

          geo.computeBoundingBox()

          /*
           * Ancho real de GLAM.
           *
           * Este valor es utilizado como spacing,
           * de manera que las repeticiones quedan pegadas.
           */
          const wordWidth =
            geo.boundingBox.max.x -
            geo.boundingBox.min.x

          const spacing = wordWidth

          geo.center()

          /*
           * Material plano.
           *
           * MeshBasicMaterial:
           * - sin iluminación
           * - sin reflejos
           * - sin especular
           * - sin glow propio
           */
          const mat =
            new THREE.MeshBasicMaterial({
              color: RED,
              transparent: true,
              opacity: 0.95,
            })

          const wordSpokes =
            spokes.filter(
              (sp) => sp.word === word
            )

          /*
           * Suficientes GLAM para cubrir
           * completamente la profundidad del túnel.
           */
          const totalSpan =
            TUNNEL_DEPTH * 1.4 +
            CAMERA_Z +
            2

          const instancesPerSpoke =
            Math.ceil(
              totalSpan / spacing
            ) + 4

          const count =
            wordSpokes.length *
            instancesPerSpoke

          const mesh =
            new THREE.InstancedMesh(
              geo,
              mat,
              count
            )

          mesh.instanceMatrix.setUsage(
            THREE.DynamicDrawUsage
          )

          scene.add(mesh)

          /*
           * data por instancia:
           *
           * [x, y, z, spokeIndex]
           */
          const data =
            new Float32Array(
              count * 4
            )

          /*
           * Posición de la cola de cada radio.
           */
          const tailZ =
            new Float32Array(
              wordSpokes.length
            )

          wordSpokes.forEach(
            (spoke, spokeIndexInWord) => {

              const offset =
                spokeIndexInWord *
                instancesPerSpoke

              const chainData =
                new Float32Array(
                  instancesPerSpoke * 4
                )

              seedChain(
                chainData,
                spokeIndexInWord,
                spoke,
                instancesPerSpoke,
                spacing
              )

              data.set(
                chainData,
                offset * 4
              )

              /*
               * Cola inicial justo detrás
               * de la última instancia.
               */
              tailZ[
                spokeIndexInWord
              ] =
                -TUNNEL_DEPTH * 1.4 -
                spacing
            }
          )

          meshes.push({
            mesh,
            data,
            count,
            wordSpokes,
            tailZ,
            spacing,
          })
        })

        fontLoaded = true
      },

      undefined,

      () => {
        /*
         * Si la fuente falla,
         * el fondo negro queda como fallback.
         */
      }
    )

    // ── Post-procesado ───────────────────────────────────────
    //
    // IMPORTANTE:
    // UnrealBloomPass fue eliminado.
    //
    // Por lo tanto NO hay Bloom / Glow.
    //

    const composer =
      new EffectComposer(renderer)

    composer.addPass(
      new RenderPass(
        scene,
        camera
      )
    )

    /*
     * Afterimage:
     *
     * Se conserva porque forma parte del efecto
     * de movimiento original.
     *
     * No es Bloom ni Glow.
     */
    const afterimagePass =
      new AfterimagePass(0.55)

    composer.addPass(
      afterimagePass
    )

    /*
     * Film:
     * Se conserva exactamente como estaba.
     */
    const filmPass =
      new FilmPass(
        0.25,
        false
      )

    composer.addPass(
      filmPass
    )

    // ── Pase final: motion blur radial ───────────────────────

    const warpShader = {
      uniforms: {
        tDiffuse: {
          value: null,
        },

        uCenter: {
          value:
            new THREE.Vector2(
              0.5,
              0.5
            ),
        },

        uStrength: {
          value: 0.22,
        },

        /*
         * Aberración cromática eliminada.
         *
         * No aporta al efecto que estás buscando.
         */
        uAberration: {
          value: 0.0,
        },
      },

      vertexShader: /* glsl */ `
        varying vec2 vUv;

        void main() {
          vUv = uv;

          gl_Position =
            projectionMatrix *
            modelViewMatrix *
            vec4(position, 1.0);
        }
      `,

      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform vec2 uCenter;
        uniform float uStrength;
        uniform float uAberration;

        varying vec2 vUv;

        void main() {

          vec2 dir =
            vUv - uCenter;

          float dist =
            length(dir);

          vec2 dirNorm =
            dist > 0.0001
              ? dir / dist
              : vec2(0.0);

          const int SAMPLES = 6;

          vec3 col =
            vec3(0.0);

          float total =
            0.0;

          for (
            int i = 0;
            i < SAMPLES;
            i++
          ) {

            float t =
              float(i) /
              float(SAMPLES - 1);

            float scale =
              1.0 -
              uStrength *
              dist *
              t;

            vec2 uv =
              uCenter +
              dir *
              scale;

            float w =
              1.0 -
              t * 0.4;

            col +=
              texture2D(
                tDiffuse,
                uv
              ).rgb * w;

            total += w;
          }

          col /=
            max(
              total,
              0.0001
            );

          /*
           * Sin aberración cromática.
           *
           * Se utiliza únicamente el color original.
           */
          gl_FragColor =
            vec4(
              col,
              1.0
            );
        }
      `,
    }

    const warpPass =
      new ShaderPass(
        warpShader
      )

    warpPass.renderToScreen = true

    composer.addPass(
      warpPass
    )

    // ── Resize ───────────────────────────────────────────────

    function resize() {
      const w =
        mount.clientWidth || 1

      const h =
        mount.clientHeight || 1

      camera.aspect =
        w / h

      camera.updateProjectionMatrix()

      renderer.setSize(
        w,
        h
      )

      composer.setSize(
        w,
        h
      )
    }

    resize()

    window.addEventListener(
      'resize',
      resize
    )

    // ── Loop de animación ───────────────────────────────────

    const clock =
      new THREE.Clock()

    function animate() {
      raf =
        requestAnimationFrame(
          animate
        )

      const dt =
        Math.min(
          clock.getDelta(),
          0.05
        )

      if (fontLoaded) {

        /*
         * ======================================================
         * ORIENTACIÓN ORIGINAL — NO TOCAR
         * ======================================================
         */

        basisX.copy(
          flowDir
        )

        basisY
          .copy(worldUp)
          .sub(
            basisX
              .clone()
              .multiplyScalar(
                worldUp.dot(
                  basisX
                )
              )
          )
          .normalize()

        basisZ
          .crossVectors(
            basisX,
            basisY
          )
          .normalize()

        basisMatrix.makeBasis(
          basisX,
          basisY,
          basisZ
        )

        flowQuat.setFromRotationMatrix(
          basisMatrix
        )

        /*
         * ======================================================
         * ACTUALIZACIÓN DE LAS CADENAS
         * ======================================================
         */

        meshes.forEach(
          ({
            mesh,
            data,
            count,
            wordSpokes,
            tailZ,
            spacing,
          }) => {

            for (
              let i = 0;
              i < count;
              i++
            ) {

              const idx =
                i * 4

              let z =
                data[idx + 2]

              const spokeIndexInWord =
                data[idx + 3]

              const spoke =
                wordSpokes[
                  spokeIndexInWord
                ]

              const speed =
                spoke.speed

              // ── Proximidad ────────────────────────────────

              const proximity =
                THREE.MathUtils.clamp(
                  (
                    z +
                    TUNNEL_DEPTH
                  ) /
                    TUNNEL_DEPTH,
                  0,
                  1
                )

              /*
               * MISMA aceleración original.
               */
              const accel =
                speed *
                (
                  0.7 +
                  Math.pow(
                    proximity,
                    2.4
                  ) * 10
                )

              z +=
                accel *
                dt *
                5.5

              // ── Reciclaje infinito ────────────────────────

              if (
                z >
                CAMERA_Z + 1.2
              ) {

                /*
                 * Se engancha exactamente
                 * detrás de la última GLAM
                 * del mismo radio.
                 */
                z =
                  tailZ[
                    spokeIndexInWord
                  ]

                tailZ[
                  spokeIndexInWord
                ] -= spacing
              }

              data[idx + 2] =
                z

              // ── Escala original ──────────────────────────

              const scaleT =
                THREE.MathUtils.clamp(
                  (
                    z +
                    TUNNEL_DEPTH
                  ) /
                    TUNNEL_DEPTH,
                  0,
                  1
                )

              const scale =
                0.5 +
                scaleT * 1.1

              // ── Tail Stretch original ─────────────────────

              const stretch =
                1 +
                proximity *
                speed *
                TAIL_STRETCH

              const openT =
                Math.pow(
                  proximity,
                  1.6
                )

              const openScale =
                scale *
                (
                  1 +
                  openT *
                  OPEN_AMOUNT
                )

              // ── Transformación ────────────────────────────

              dummy.position.set(
                data[idx],
                data[idx + 1],
                z
              )

              /*
               * =================================================
               * ORIENTACIÓN ORIGINAL
               * =================================================
               *
               * NO SE CAMBIA.
               *
               * El texto continúa orientado exactamente
               * como estaba en tu versión original.
               */
              dummy.quaternion.copy(
                flowQuat
              )

              /*
               * Se conserva exactamente
               * el comportamiento de escala original.
               *
               * No se altera el eje de orientación.
               */
              dummy.scale.set(
                scale * stretch,
                openScale,
                openScale
              )

              dummy.updateMatrix()

              mesh.setMatrixAt(
                i,
                dummy.matrix
              )
            }

            mesh.instanceMatrix.needsUpdate =
              true
          }
        )
      }

      composer.render()
    }

    animate()

    // ── Cleanup ──────────────────────────────────────────────

    return () => {
      disposed = true

      cancelAnimationFrame(
        raf
      )

      window.removeEventListener(
        'resize',
        resize
      )

      meshes.forEach(
        ({ mesh }) => {
          mesh.geometry.dispose()
          mesh.material.dispose()
        }
      )

      renderer.dispose()

      if (
        mount.contains(
          renderer.domElement
        )
      ) {
        mount.removeChild(
          renderer.domElement
        )
      }
    }

  }, [])

  return (
    <div
      ref={mountRef}
      className="warp-tunnel"
      aria-label="Túnel de velocidad GLAM"
    />
  )
}
```
