import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js'
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import './HeroWarpTunnel.css'

/*
 * GLAM INFINITE TUNNEL
 *
 * GLAM se repite continuamente:
 *
 * GLAMGLAMGLAMGLAMGLAMGLAMGLAM...
 *
 * Cada cadena se mueve hacia la cámara y al salir
 * vuelve exactamente detrás de la última palabra,
 * creando un loop infinito sin cortes.
 *
 * El texto es FLAT:
 * - Sin extrusión
 * - Sin bevel
 * - Sin profundidad 3D
 * - Sin Bloom
 * - Sin Glow
 *
 * La distribución continúa siendo cilíndrica,
 * creando el túnel alrededor del espectador.
 */

const WORD = 'GLAM'

const SPOKE_COUNT = 18
const TUNNEL_DEPTH = 46
const TUNNEL_RADIUS = 10.5
const CAMERA_Z = 6

const BASE_SCALE = 0.55
const SPEED_MIN = 0.7
const SPEED_MAX = 1.15

export default function HeroWarpTunnel() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let raf = 0
    let disposed = false
    let fontLoaded = false

    // ------------------------------------------------------------
    // ESCENA
    // ------------------------------------------------------------

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
      alpha: false,
    })

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 2)
    )

    mount.appendChild(renderer.domElement)

    // ------------------------------------------------------------
    // MATERIAL
    // ------------------------------------------------------------

    const RED = new THREE.Color('#FF0000')

    const dummy = new THREE.Object3D()

    /*
     * Cada mesh contiene las repeticiones de GLAM
     * correspondientes a sus respectivos radios.
     */
    const meshes = []

    // ------------------------------------------------------------
    // RADIOS DEL TÚNEL
    // ------------------------------------------------------------

    const spokes = []

    for (let s = 0; s < SPOKE_COUNT; s++) {
      const angle =
        (s / SPOKE_COUNT) * Math.PI * 2 +
        (Math.random() - 0.5) * 0.08

      const radius =
        TUNNEL_RADIUS *
        (0.62 + Math.random() * 0.38)

      const speed =
        SPEED_MIN +
        Math.random() * (SPEED_MAX - SPEED_MIN)

      spokes.push({
        angle,
        radius,
        speed,
      })
    }

    // ------------------------------------------------------------
    // CREAR CADENA INFINITA
    // ------------------------------------------------------------

    function seedChain(
      data,
      spoke,
      count,
      spacing
    ) {
      const x =
        Math.cos(spoke.angle) *
        spoke.radius

      const y =
        Math.sin(spoke.angle) *
        spoke.radius

      for (let k = 0; k < count; k++) {
        const idx = k * 3

        data[idx + 0] = x
        data[idx + 1] = y

        /*
         * Todas las palabras nacen alineadas.
         * No existe una distribución aleatoria
         * entre ellas.
         *
         * GLAM GLAM GLAM GLAM
         *  ↓
         * GLAMGLAMGLAMGLAM
         */
        data[idx + 2] =
          -TUNNEL_DEPTH * 1.4 +
          k * spacing
      }
    }

    // ------------------------------------------------------------
    // CARGAR FUENTE
    // ------------------------------------------------------------

    const loader = new FontLoader()

    loader.load(
      '/fonts/helvetiker_bold.typeface.json',

      (font) => {
        if (disposed) return

        /*
         * --------------------------------------------------------
         * FLAT TEXT
         * --------------------------------------------------------
         *
         * En lugar de TextGeometry utilizamos ShapeGeometry.
         *
         * Esto significa:
         *
         * depth = 0
         * bevel = 0
         * extrusión = 0
         *
         * Es literalmente una superficie plana.
         */
        const shapes = font.generateShapes(
          WORD,
          1
        )

        const geo = new THREE.ShapeGeometry(shapes)

        geo.computeBoundingBox()

        /*
         * Ancho exacto de GLAM.
         * Este ancho determina la distancia entre una
         * repetición y la siguiente.
         */
        const wordWidth =
          geo.boundingBox.max.x -
          geo.boundingBox.min.x

        /*
         * No dejamos separación adicional.
         *
         * GLAM|GLAM|GLAM
         *
         * se convierte visualmente en:
         *
         * GLAMGLAMGLAM
         */
        const spacing = wordWidth

        geo.center()

        // --------------------------------------------------------
        // MATERIAL FLAT
        // --------------------------------------------------------

        const mat =
          new THREE.MeshBasicMaterial({
            color: RED,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide,

            /*
             * Sin iluminación.
             * Sin especular.
             * Sin reflejos.
             * Sin glow.
             */
          })

        /*
         * Todas las spokes utilizan la misma geometría GLAM.
         */
        const totalSpan =
          TUNNEL_DEPTH * 1.4 +
          CAMERA_Z +
          4

        const instancesPerSpoke =
          Math.ceil(
            totalSpan / spacing
          ) + 5

        const count =
          SPOKE_COUNT *
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
         * Por instancia:
         *
         * x
         * y
         * z
         * spokeIndex
         */
        const data =
          new Float32Array(
            count * 4
          )

        /*
         * Guarda dónde está la cola de cada
         * cadena para reciclar GLAM perfectamente.
         */
        const tailZ =
          new Float32Array(
            SPOKE_COUNT
          )

        // --------------------------------------------------------
        // SEMBRAR TODAS LAS CADENAS
        // --------------------------------------------------------

        spokes.forEach(
          (spoke, spokeIndex) => {
            const offset =
              spokeIndex *
              instancesPerSpoke

            const chainData =
              new Float32Array(
                instancesPerSpoke * 4
              )

            seedChain(
              chainData,
              spoke,
              instancesPerSpoke,
              spacing
            )

            /*
             * Guardamos la información
             * dentro del array global.
             */
            for (
              let k = 0;
              k < instancesPerSpoke;
              k++
            ) {
              const source =
                k * 3

              const target =
                (offset + k) * 4

              data[target + 0] =
                chainData[source + 0]

              data[target + 1] =
                chainData[source + 1]

              data[target + 2] =
                chainData[source + 2]

              data[target + 3] =
                spokeIndex
            }

            /*
             * La cola está inmediatamente detrás
             * de la última palabra.
             */
            tailZ[spokeIndex] =
              -TUNNEL_DEPTH * 1.4 -
              spacing
          }
        )

        meshes.push({
          mesh,
          data,
          count,
          spokes,
          tailZ,
          spacing,
        })

        fontLoaded = true
      },

      undefined,

      () => {
        /*
         * Fallback silencioso.
         */
      }
    )

    // ------------------------------------------------------------
    // POST PROCESS
    // ------------------------------------------------------------

    /*
     * IMPORTANTE:
     *
     * NO UnrealBloomPass.
     *
     * Esto elimina completamente el Glow.
     */

    const composer =
      new EffectComposer(renderer)

    composer.addPass(
      new RenderPass(
        scene,
        camera
      )
    )

    /*
     * Afterimage muy sutil.
     *
     * No genera glow.
     * Solo deja una pequeña sensación
     * de continuidad/velocidad.
     */
    const afterimagePass =
      new AfterimagePass(0.32)

    composer.addPass(
      afterimagePass
    )

    /*
     * Film muy ligero.
     *
     * Si quieres absolutamente cero
     * procesamiento visual puedes eliminarlo.
     */
    const filmPass =
      new FilmPass(
        0.08,
        false
      )

    composer.addPass(
      filmPass
    )

    // ------------------------------------------------------------
    // RADIAL MOTION
    // ------------------------------------------------------------

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

        /*
         * Mucho más suave que el original.
         */
        uStrength: {
          value: 0.08,
        },

        /*
         * Aberración eliminada.
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

          const int SAMPLES = 5;

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
              t * 0.3;

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
           * R = G = B original.
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

    // ------------------------------------------------------------
    // RESIZE
    // ------------------------------------------------------------

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

    // ------------------------------------------------------------
    // ANIMATION
    // ------------------------------------------------------------

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

        meshes.forEach(
          ({
            mesh,
            data,
            count,
            spokes,
            tailZ,
            spacing,
          }) => {

            /*
             * ----------------------------------------------------
             * ACTUALIZAR CADA GLAM
             * ----------------------------------------------------
             */

            for (
              let i = 0;
              i < count;
              i++
            ) {

              const idx =
                i * 4

              let z =
                data[idx + 2]

              const spokeIndex =
                data[idx + 3]

              const spoke =
                spokes[
                  spokeIndex
                ]

              /*
               * --------------------------------------------------
               * VELOCIDAD
               * --------------------------------------------------
               */

              const proximity =
                THREE.MathUtils.clamp(
                  (z + TUNNEL_DEPTH) /
                    TUNNEL_DEPTH,
                  0,
                  1
                )

              /*
               * Aceleración progresiva.
               *
               * Las palabras se mantienen
               * siempre en el mismo orden.
               */
              const accel =
                spoke.speed *
                (
                  0.8 +
                  Math.pow(
                    proximity,
                    2.1
                  ) * 7
                )

              z +=
                accel *
                dt *
                5.0

              // --------------------------------------------------
              // RECICLAR
              // --------------------------------------------------

              if (
                z >
                CAMERA_Z + 1.2
              ) {

                /*
                 * La nueva palabra aparece exactamente
                 * detrás de la anterior.
                 *
                 * Esto es lo que genera:
                 *
                 * GLAMGLAMGLAMGLAMGLAM
                 * ↑
                 * sin huecos
                 */
                z =
                  tailZ[
                    spokeIndex
                  ]

                tailZ[
                  spokeIndex
                ] -= spacing
              }

              data[idx + 2] =
                z

              // --------------------------------------------------
              // ESCALA
              // --------------------------------------------------

              /*
               * La palabra aumenta ligeramente
               * por perspectiva al acercarse.
               *
               * NO se estira.
               */
              const scaleT =
                THREE.MathUtils.clamp(
                  (z + TUNNEL_DEPTH) /
                    TUNNEL_DEPTH,
                  0,
                  1
                )

              const scale =
                BASE_SCALE +
                scaleT * 0.7

              // --------------------------------------------------
              // TRANSFORMACIÓN
              // --------------------------------------------------

              dummy.position.set(
                data[idx + 0],
                data[idx + 1],
                z
              )

              /*
               * Texto frontal y completamente plano.
               *
               * La geometría está mirando hacia
               * la cámara, no tiene profundidad.
               */
              dummy.rotation.set(
                0,
                0,
                0
              )

              dummy.scale.set(
                scale,
                scale,
                1
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

    // ------------------------------------------------------------
    // CLEANUP
    // ------------------------------------------------------------

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
      aria-label="GLAM infinite flat text tunnel"
    />
  )
}
