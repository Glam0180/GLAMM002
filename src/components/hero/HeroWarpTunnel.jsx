import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import GUI from 'lil-gui'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js'
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
// Fuente variable empaquetada localmente (NO depende de Google Fonts /
// internet en tiempo real — evita que adblockers, extensiones de
// privacidad o redes corporativas bloqueen la descarga y maten el efecto).
// Requiere: npm install @fontsource-variable/big-shoulders-display
import '@fontsource-variable/big-shoulders-display'
import './HeroWarpTunnel.css'

// Panel de control (lil-gui, esquina superior derecha): todos los valores
// de abajo son ajustables en vivo. La lógica del túnel (spokes con período
// medido exacto, orientación por quaternion, apertura/jitter/stretch) NO
// se toca — solo se parametriza para poder moverla desde sliders.
const WORDS = ['GLAM', 'LAB']

const DEFAULTS = {
  // Construcción (dispara reconstrucción de las cintas)
  spokeCount: 77,
  tunnelDepth: 40,
  tunnelRadius: 5.2,
  textSize: 0.1,
  coreSpokeCount: 31,      // rayos extra pegados al eje central (llenan el centro/cerca de cámara)
  coreRadiusFactor: 0.28,  // qué tan cerca del eje quedan (fracción de tunnelRadius)
  // Movimiento (en vivo, sin reconstruir)
  cameraZ: 5.7,
  scrollSpeed: 0.4,
  expansionBase: 1.22,
  expansionRange: 0.15,
  expansionPower: 2.2,
  jitterAmount: 0.04,
  jitterFreqX: 1.5,
  jitterFreqY: 1.2,
  stretchAmount: 0.35,
  // Cámara · seguimiento del mouse (en vivo, rango limitado — solo desktop)
  mouseYawMax: 0.6,       // rad — cuánto puede girar horizontalmente (izq/der)
  mousePitchMax: 0.6,     // rad — cuánto puede girar verticalmente (arriba/abajo)
  mouseDamping: 0.07,     // suavizado del seguimiento (0 = nunca llega, 1 = instantáneo)
  invertMouseX: true,
  invertMouseY: true,
  // Cámara · mobile: rotación 100% libre arrastrando con el dedo (sin límite)
  touchSensitivity: 0.006, // rad de giro por pixel arrastrado
  // Post-proceso (en vivo)
  bloomStrength: 0.02,
  bloomRadius: 0.19,
  bloomThreshold: 0.17,
  afterimageDamp: 0.14,
  filmIntensity: 0,
  filmGrayscale: false,
  warpStrength: 0.22,
  warpAberration: 0.10,
}

// ════════════════════════════════════════════════════════════════════
// TextPressure — portado TAL CUAL de https://codepen.io/JuanFuentes/full/rgXKGQ
// (misma lógica, sin adaptaciones "custom" que puedan romper el efecto).
// Cada letra es un <span> que mide su propia distancia al cursor
// suavizado y ajusta su font-variation-settings ('wght') en vivo.
// ════════════════════════════════════════════════════════════════════
const dist = (a, b) => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

const getAttr = (distance, maxDist, minVal, maxVal) => {
  const val = maxVal - Math.abs((maxVal * distance) / maxDist)
  return Math.max(minVal, val + minVal)
}

const debounce = (func, delay) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      func.apply(this, args)
    }, delay)
  }
}

const TextPressure = ({
  text = 'Compressa',
  fontFamily = "'Big Shoulders Display Variable'",
  fontUrl = '', // vacío: ya importamos la fuente vía @fontsource arriba, no hace falta @import remoto

  width = false,   // Big Shoulders Display no tiene eje 'wdth' — lo dejamos apagado
  weight = true,
  italic = false,  // tampoco tiene eje 'ital'
  alpha = false,

  flex = true,
  stroke = false,
  scale = false,

  textColor = '#0a0a0a',
  strokeColor = '#FF0000',
  className = '',

  minFontSize = 24,
}) => {
  const containerRef = useRef(null)
  const titleRef = useRef(null)
  const spansRef = useRef([])

  const mouseRef = useRef({ x: 0, y: 0 })
  const cursorRef = useRef({ x: 0, y: 0 })

  const [fontSize, setFontSize] = useState(minFontSize)
  const [scaleY, setScaleY] = useState(1)
  const [lineHeight, setLineHeight] = useState(1)

  const chars = text.split('')

  useEffect(() => {
    const handleMouseMove = (e) => {
      cursorRef.current.x = e.clientX
      cursorRef.current.y = e.clientY
    }
    const handleTouchMove = (e) => {
      const t = e.touches[0]
      cursorRef.current.x = t.clientX
      cursorRef.current.y = t.clientY
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchmove', handleTouchMove, { passive: true })

    if (containerRef.current) {
      const { left, top, width, height } = containerRef.current.getBoundingClientRect()
      mouseRef.current.x = left + width / 2
      mouseRef.current.y = top + height / 2
      cursorRef.current.x = mouseRef.current.x
      cursorRef.current.y = mouseRef.current.y
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  const setSize = useCallback(() => {
    if (!containerRef.current || !titleRef.current) return

    const { width: containerW, height: containerH } = containerRef.current.getBoundingClientRect()

    let newFontSize = containerW / (chars.length / 2)
    newFontSize = Math.max(newFontSize, minFontSize)

    setFontSize(newFontSize)
    setScaleY(1)
    setLineHeight(1)

    requestAnimationFrame(() => {
      if (!titleRef.current) return
      const textRect = titleRef.current.getBoundingClientRect()

      if (scale && textRect.height > 0) {
        const yRatio = containerH / textRect.height
        setScaleY(yRatio)
        setLineHeight(yRatio)
      }
    })
  }, [chars.length, minFontSize, scale])

  useEffect(() => {
    const debouncedSetSize = debounce(setSize, 100)
    debouncedSetSize()
    window.addEventListener('resize', debouncedSetSize)
    return () => window.removeEventListener('resize', debouncedSetSize)
  }, [setSize])

  useEffect(() => {
    let rafId
    const animate = () => {
      mouseRef.current.x += (cursorRef.current.x - mouseRef.current.x) / 15
      mouseRef.current.y += (cursorRef.current.y - mouseRef.current.y) / 15

      if (titleRef.current) {
        const titleRect = titleRef.current.getBoundingClientRect()
        const maxDist = titleRect.width / 2

        spansRef.current.forEach((span) => {
          if (!span) return

          const rect = span.getBoundingClientRect()
          const charCenter = {
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height / 2,
          }

          const d = dist(mouseRef.current, charCenter)

          const wdth = width ? Math.floor(getAttr(d, maxDist, 5, 200)) : 100
          const wght = weight ? Math.floor(getAttr(d, maxDist, 100, 900)) : 400
          const italVal = italic ? getAttr(d, maxDist, 0, 1).toFixed(2) : 0
          const alphaVal = alpha ? getAttr(d, maxDist, 0, 1).toFixed(2) : 1

          const newFontVariationSettings = `'wght' ${wght}, 'wdth' ${wdth}, 'ital' ${italVal}`

          if (span.style.fontVariationSettings !== newFontVariationSettings) {
            span.style.fontVariationSettings = newFontVariationSettings
          }
          if (alpha && span.style.opacity !== alphaVal) {
            span.style.opacity = alphaVal
          }
        })
      }

      rafId = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(rafId)
  }, [width, weight, italic, alpha])

  const styleElement = useMemo(() => {
    return (
      <style>{`
        ${fontUrl ? `@import url('${fontUrl}');` : ''}

        .flex {
          display: flex;
          justify-content: space-between;
        }

        .stroke span {
          position: relative;
          color: ${textColor};
        }
        .stroke span::after {
          content: attr(data-char);
          position: absolute;
          left: 0;
          top: 0;
          color: transparent;
          z-index: -1;
          -webkit-text-stroke-width: 3px;
          -webkit-text-stroke-color: ${strokeColor};
        }

        .text-pressure-title {
          color: ${textColor};
        }
      `}</style>
    )
  }, [fontUrl, textColor, strokeColor])

  const dynamicClassName = [className, flex ? 'flex' : '', stroke ? 'stroke' : ''].filter(Boolean).join(' ')

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'transparent',
      }}
    >
      {styleElement}
      <h1
        ref={titleRef}
        className={`text-pressure-title ${dynamicClassName}`}
        style={{
          fontFamily,
          textTransform: 'uppercase',
          fontSize,
          lineHeight,
          transform: `scale(1, ${scaleY})`,
          transformOrigin: 'center top',
          margin: 0,
          textAlign: 'center',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          fontWeight: 100,
          width: '100%',
        }}
      >
        {chars.map((char, i) => (
          <span
            key={i}
            ref={(el) => {
              spansRef.current[i] = el
            }}
            data-char={char}
            style={{
              display: 'inline-block',
              color: stroke ? undefined : textColor,
            }}
          >
            {char}
          </span>
        ))}
      </h1>
    </div>
  )
}

export default function HeroWarpTunnel() {
  const mountRef = useRef(null)
  const guiHostRef = useRef(null)

  // Diagnóstico: si por algún motivo la fuente variable no quedó
  // disponible (paquete no instalado, CSS no importado, etc.), avisar
  // en consola en vez de fallar en silencio.
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return
    document.fonts.ready.then(() => {
      const ok = document.fonts.check("900 16px 'Big Shoulders Display Variable'")
      if (!ok) {
        // eslint-disable-next-line no-console
        console.warn(
          '[HeroWarpTunnel] No se detectó "Big Shoulders Display Variable". ' +
          'Verificá que corriste "npm install @fontsource-variable/big-shoulders-display" ' +
          'y que el import esté en este archivo. Sin esta fuente, el efecto de peso variable no se ve.'
        )
      }
    })
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let raf = 0, disposed = false, fontLoaded = false, loadedFont = null

    const params = { ...DEFAULTS }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 100)
    camera.position.set(0, 0, params.cameraZ)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    mount.appendChild(renderer.domElement)

    const RED = new THREE.Color('#FF0000')
    let strips = []

    // ORIENTACION ORIGINAL - NO SE TOCA
    const flowDir = new THREE.Vector3(0, 0, 1)
    const worldUp = new THREE.Vector3(0, 1, 0)
    const basisX = new THREE.Vector3(), basisY = new THREE.Vector3(), basisZ = new THREE.Vector3()
    const basisMatrix = new THREE.Matrix4()
    const flowQuat = new THREE.Quaternion()

    // ── Cámara: seguimiento del mouse (desktop, limitado) o
    // rotación 100% libre por arrastre táctil (mobile) ─────────
    const isMobile = ('ontouchstart' in window) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    const pointer = { x: 0, y: 0 }
    const tilt = { x: 0, y: 0 }
    const freeDrag = { yaw: 0, pitch: 0 }
    const dragState = { active: false, lastX: 0, lastY: 0 }
    const baseCameraQuat = new THREE.Quaternion() // orientación base (mirando hacia -z)

    function onPointerMove(e) {
      const rect = mount.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1
      pointer.x = THREE.MathUtils.clamp(nx, -1, 1)
      pointer.y = THREE.MathUtils.clamp(ny, -1, 1)
    }

    function onTouchStart(e) {
      if (e.touches.length !== 1) return
      dragState.active = true
      dragState.lastX = e.touches[0].clientX
      dragState.lastY = e.touches[0].clientY
    }
    function onTouchMove(e) {
      if (!dragState.active || e.touches.length !== 1) return
      const t = e.touches[0]
      const dx = t.clientX - dragState.lastX
      const dy = t.clientY - dragState.lastY
      dragState.lastX = t.clientX
      dragState.lastY = t.clientY
      // Sin clamp: la rotación acumulada puede crecer libremente en
      // cualquier dirección, dando vuelta completa si el usuario quiere.
      freeDrag.yaw -= dx * params.touchSensitivity
      freeDrag.pitch -= dy * params.touchSensitivity
    }
    function onTouchEnd() { dragState.active = false }

    if (isMobile) {
      mount.addEventListener('touchstart', onTouchStart, { passive: true })
      mount.addEventListener('touchmove', onTouchMove, { passive: true })
      window.addEventListener('touchend', onTouchEnd)
      window.addEventListener('touchcancel', onTouchEnd)
    } else {
      window.addEventListener('mousemove', onPointerMove)
    }

    function resetCameraTilt() {
      pointer.x = 0; pointer.y = 0
      tilt.x = 0; tilt.y = 0
      freeDrag.yaw = 0; freeDrag.pitch = 0
      camera.quaternion.copy(baseCameraQuat)
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

    // ── Construcción / reconstrucción de las cintas ───────────
    function buildStrips() {
      const disposedGeo = new Set()
      strips.forEach(({ mesh }) => {
        scene.remove(mesh)
        if (!disposedGeo.has(mesh.geometry)) {
          mesh.geometry.dispose()
          disposedGeo.add(mesh.geometry)
        }
        mesh.material.dispose()
      })
      strips = []
      if (!loadedFont) return

      const spokeCount = Math.max(2, Math.round(params.spokeCount))
      const spokes = []
      for (let s = 0; s < spokeCount; s++) {
        const angle = (s / spokeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.12
        spokes.push({
          angle,
          radius: params.tunnelRadius * (0.55 + Math.random() * 0.45),
          speed: 0.7 + Math.random() * 0.5,
          word: WORDS[s % WORDS.length],
          phase: Math.random() * Math.PI * 2,
        })
      }

      // Rayos de núcleo: mismo texto, pero pegados al eje central, para que
      // también haya letras pasando por la zona donde está la cámara / el
      // centro de la pantalla (si no, queda un hueco vacío ahí).
      const coreSpokeCount = Math.max(0, Math.round(params.coreSpokeCount))
      for (let s = 0; s < coreSpokeCount; s++) {
        const angle = Math.random() * Math.PI * 2
        spokes.push({
          angle,
          radius: params.tunnelRadius * params.coreRadiusFactor * (0.05 + Math.random() * 0.95),
          speed: 0.7 + Math.random() * 0.5,
          word: WORDS[s % WORDS.length],
          phase: Math.random() * Math.PI * 2,
        })
      }

      WORDS.forEach((word) => {
        const period = measurePeriod(loadedFont, word, params.textSize)
        const baseZ = -params.tunnelDepth * 1.4 - period
        const totalNeeded = (params.cameraZ + 1.2) - baseZ
        const repeatCount = Math.ceil(totalNeeded / period) + 2
        const shapes = loadedFont.generateShapes(word.repeat(repeatCount), params.textSize)
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
    }

    const loader = new FontLoader()
    loader.load('/fonts/helvetiker_bold.typeface.json', (font) => {
      if (disposed) return
      loadedFont = font
      fontLoaded = true
      buildStrips()
    })

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), params.bloomStrength, params.bloomRadius, params.bloomThreshold)
    composer.addPass(bloomPass)
    const afterimagePass = new AfterimagePass(params.afterimageDamp)
    composer.addPass(afterimagePass)
    const filmPass = new FilmPass(params.filmIntensity, params.filmGrayscale)
    composer.addPass(filmPass)

    const warpShader = {
      uniforms: {
        tDiffuse: { value: null },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uStrength: { value: params.warpStrength },
        uAberration: { value: params.warpAberration },
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

    // ── Panel de control (lil-gui) ─────────────────────────────
    const gui = new GUI({ container: guiHostRef.current, title: 'WARP TUNNEL' })
    gui.close()

    const fBuild = gui.addFolder('Construcción (reconstruye)')
    fBuild.add(params, 'spokeCount', 4, 80, 1).name('nº de rayos').onFinishChange(buildStrips)
    fBuild.add(params, 'tunnelDepth', 2, 40, 0.5).name('profundidad').onFinishChange(buildStrips)
    fBuild.add(params, 'tunnelRadius', 0.5, 12, 0.1).name('radio').onFinishChange(buildStrips)
    fBuild.add(params, 'textSize', 0.1, 1.5, 0.05).name('tamaño texto').onFinishChange(buildStrips)
    fBuild.add(params, 'coreSpokeCount', 0, 80, 1).name('rayos de núcleo').onFinishChange(buildStrips)
    fBuild.add(params, 'coreRadiusFactor', 0, 1, 0.01).name('radio del núcleo').onFinishChange(buildStrips)

    const fMotion = gui.addFolder('Movimiento')
    fMotion.add(params, 'cameraZ', 1, 15, 0.1).name('cámara Z').onChange((v) => { camera.position.z = v })
    fMotion.add(params, 'scrollSpeed', 0, 12, 0.1).name('velocidad')
    fMotion.add(params, 'expansionBase', 0, 1.5, 0.01).name('apertura · base')
    fMotion.add(params, 'expansionRange', 0, 1.5, 0.01).name('apertura · rango')
    fMotion.add(params, 'expansionPower', 0.2, 4, 0.05).name('apertura · curva')
    fMotion.add(params, 'jitterAmount', 0, 0.3, 0.005).name('jitter')
    fMotion.add(params, 'jitterFreqX', 0, 6, 0.1).name('jitter freq X')
    fMotion.add(params, 'jitterFreqY', 0, 6, 0.1).name('jitter freq Y')
    fMotion.add(params, 'stretchAmount', 0, 1.5, 0.01).name('estiramiento')

    const fCam = gui.addFolder('Cámara · mouse (desktop) / arrastre (mobile)')
    fCam.add(params, 'mouseYawMax', 0, 1.5, 0.01).name('límite horizontal (desktop)')
    fCam.add(params, 'mousePitchMax', 0, 1.2, 0.01).name('límite vertical (desktop)')
    fCam.add(params, 'mouseDamping', 0.01, 0.3, 0.005).name('suavizado')
    fCam.add(params, 'invertMouseX').name('invertir X (desktop)')
    fCam.add(params, 'invertMouseY').name('invertir Y (desktop)')
    fCam.add(params, 'touchSensitivity', 0.001, 0.02, 0.001).name('sensibilidad táctil (mobile, libre)')

    const fPost = gui.addFolder('Post-proceso')
    fPost.add(params, 'bloomStrength', 0, 3, 0.01).name('bloom · fuerza').onChange((v) => { bloomPass.strength = v })
    fPost.add(params, 'bloomRadius', 0, 1.5, 0.01).name('bloom · radio').onChange((v) => { bloomPass.radius = v })
    fPost.add(params, 'bloomThreshold', 0, 1, 0.01).name('bloom · umbral').onChange((v) => { bloomPass.threshold = v })
    fPost.add(params, 'afterimageDamp', 0, 0.98, 0.01).name('estela (afterimage)').onChange((v) => { afterimagePass.uniforms['damp'].value = v })
    fPost.add(params, 'filmIntensity', 0, 1, 0.01).name('grano de película').onChange((v) => { filmPass.uniforms['intensity'].value = v })
    fPost.add(params, 'filmGrayscale').name('grano · b/n').onChange((v) => { filmPass.uniforms['grayscale'].value = v })
    fPost.add(params, 'warpStrength', 0, 1.2, 0.01).name('blur radial').onChange((v) => { warpPass.uniforms.uStrength.value = v })
    fPost.add(params, 'warpAberration', 0, 0.6, 0.01).name('aberración cromática').onChange((v) => { warpPass.uniforms.uAberration.value = v })

    gui.add({
      reset: () => {
        Object.assign(params, DEFAULTS)
        camera.position.z = params.cameraZ
        bloomPass.strength = params.bloomStrength
        bloomPass.radius = params.bloomRadius
        bloomPass.threshold = params.bloomThreshold
        afterimagePass.uniforms['damp'].value = params.afterimageDamp
        filmPass.uniforms['intensity'].value = params.filmIntensity
        filmPass.uniforms['grayscale'].value = params.filmGrayscale
        warpPass.uniforms.uStrength.value = params.warpStrength
        warpPass.uniforms.uAberration.value = params.warpAberration
        resetCameraTilt()
        buildStrips()
        gui.controllersRecursive().forEach((c) => c.updateDisplay())
      },
    }, 'reset').name('↺ restablecer')
    gui.add({
      logValues: () => console.log(JSON.stringify(params, null, 2)), // eslint-disable-line no-console
    }, 'logValues').name('⎘ copiar valores (consola)')

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
          strip.scrollOffset += strip.speed * params.scrollSpeed * dt
          strip.scrollOffset %= strip.period
          const currentZ = strip.baseZ + strip.scrollOffset

          // 1. Apertura radial cilindrica
          const total = params.cameraZ + params.tunnelDepth * 1.4 + strip.period
          const p = (currentZ + params.tunnelDepth * 1.4 + strip.period) / total
          const expansion = params.expansionBase + params.expansionRange * Math.pow(p, params.expansionPower)

          // 2. Jitter micro
          const jx = Math.sin(elapsed * params.jitterFreqX + strip.phase) * params.jitterAmount
          const jy = Math.cos(elapsed * params.jitterFreqY + strip.phase) * params.jitterAmount

          strip.mesh.position.set(
            Math.cos(strip.angle) * strip.baseRadius * expansion + jx,
            Math.sin(strip.angle) * strip.baseRadius * expansion + jy,
            currentZ
          )
          // 3. Orientacion original intacta
          strip.mesh.quaternion.copy(flowQuat)

          // 4. Velocity Stretch
          strip.mesh.scale.x = 1.0 + strip.speed * params.stretchAmount * p
          strip.mesh.scale.y = 1.0
        })
      }

      // ── Cámara: en desktop se acerca suavemente al mouse, siempre
      // acotada por mouseYawMax/mousePitchMax. En mobile es 100% libre:
      // sigue el arrastre acumulado del dedo sin ningún límite.
      if (isMobile) {
        tilt.x += (freeDrag.pitch - tilt.x) * params.mouseDamping
        tilt.y += (freeDrag.yaw - tilt.y) * params.mouseDamping
      } else {
        const signX = params.invertMouseX ? -1 : 1
        const signY = params.invertMouseY ? -1 : 1
        const targetYaw = -pointer.x * params.mouseYawMax * signX
        const targetPitch = pointer.y * params.mousePitchMax * signY
        tilt.x += (targetPitch - tilt.x) * params.mouseDamping
        tilt.y += (targetYaw - tilt.y) * params.mouseDamping
      }
      camera.quaternion.copy(baseCameraQuat)
      camera.rotateY(tilt.y)
      camera.rotateX(tilt.x)

      composer.render()
    }
    animate()

    return()=>{
      disposed=true; cancelAnimationFrame(raf)
      window.removeEventListener('resize',resize)
      if (isMobile) {
        mount.removeEventListener('touchstart', onTouchStart)
        mount.removeEventListener('touchmove', onTouchMove)
        window.removeEventListener('touchend', onTouchEnd)
        window.removeEventListener('touchcancel', onTouchEnd)
      } else {
        window.removeEventListener('mousemove', onPointerMove)
      }
      gui.destroy()
      const g=new Set(); strips.forEach(({mesh})=>{ if(!g.has(mesh.geometry)){mesh.geometry.dispose(); g.add(mesh.geometry)} })
      renderer.dispose()
      if(mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  },[])

  return (
    <div className="warp-tunnel-wrap">
      <div ref={mountRef} className="warp-tunnel" aria-label="Túnel de velocidad hiperespacial" />

      <div className="warp-center-text" aria-hidden="true">
        <div className="wct-band wct-band--1">
          <TextPressure text="LAB" />
        </div>
        <div className="wct-band wct-band--2">
          <TextPressure text="DESING" />
        </div>
      </div>

      <div ref={guiHostRef} className="warp-tunnel__gui" />

      <style>{`
        .warp-center-text {
          position: absolute;
          inset: 0;
          z-index: 4;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: center;
          pointer-events: none; /* no bloquea el mouse/touch del túnel */
        }
        .wct-band {
          background: #ff0000;
          height: clamp(3.5rem, 10vw, 10rem);
          display: flex;
          align-items: center;
        }
        .wct-band--1 {
          align-self: flex-start;
          width: 46%;
          margin-left: 6%;
        }
        .wct-band--2 {
          align-self: flex-end;
          width: 62%;
          margin-right: 5%;
          margin-top: -0.35rem; /* casi pegadas */
        }
      `}</style>
    </div>
  )
}
