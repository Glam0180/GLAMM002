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

const PARAMS = {
  flightSpeed: 0.1,
  flowDir: { x: 0, y: 0, z: 0.2 },
  fieldSpread: 6,
  acceleration: 5,
  particleDensity: 350,
  baseScale: 0.3,
  tailStretch: 10,
  textContent: "GLAMGLAMGLAMGLAMGLAMGLAMGLAMGLMAGLMA GLMA",
  textExtrusion: 0.05,
  textScale: { x: 1.9, y: 4.3, z: 0.8 },
  trailLength: 0.75,
  blurAmount: 0.35,
  bloomStrength: 1.4,
  aberrationIntensity: 0.02,
  vignetteDarkness: 1.2,
  grainStrength: 0.06,
}

export default function HeroWarpTunnel() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let raf = 0, disposed = false, fontLoaded = false

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)

    const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 100)
    camera.position.set(0, 0, 6)
    camera.rotation.order = 'YXZ' // Yaw, Pitch, Roll en su propio eje

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.domElement.style.cursor = 'grab'
    mount.appendChild(renderer.domElement)

    // --- CONTROL DE ROTACION EN SU PROPIO EJE ---
    let yaw = 0, pitch = 0, isDragging = false
    let lastX = 0, lastY = 0
    const ROT_SENS = 0.003

    const onDown = (e) => {
      isDragging = true
      const p = e.touches? e.touches[0] : e
      lastX = p.clientX; lastY = p.clientY
      renderer.domElement.style.cursor = 'grabbing'
    }
    const onMove = (e) => {
      if (!isDragging) return
      const p = e.touches? e.touches[0] : e
      const dx = p.clientX - lastX
      const dy = p.clientY - lastY
      yaw -= dx * ROT_SENS
      pitch -= dy * ROT_SENS
      pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch))
      camera.rotation.set(pitch, yaw, 0)
      lastX = p.clientX; lastY = p.clientY
    }
    const onUp = () => {
      isDragging = false
      renderer.domElement.style.cursor = 'grab'
    }

    renderer.domElement.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    renderer.domElement.addEventListener('touchstart', onDown, { passive: false })
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)

    const RED = new THREE.Color('#FF0000')
    const strips = []

    const flowDir = new THREE.Vector3(PARAMS.flowDir.x, PARAMS.flowDir.y, PARAMS.flowDir.z).normalize()
    if (flowDir.length() === 0) flowDir.set(0,0,1)
    const worldUp = new THREE.Vector3(0, 1, 0)
    const basisX = new THREE.Vector3(), basisY = new THREE.Vector3(), basisZ = new THREE.Vector3()
    const basisMatrix = new THREE.Matrix4()
    const flowQuat = new THREE.Quaternion()

    const spokes = []
    for (let s = 0; s < PARAMS.particleDensity; s++) {
      const angle = (s / PARAMS.particleDensity) * Math.PI * 12 + Math.random()
      spokes.push({
        angle,
        radius: Math.random() * PARAMS.fieldSpread,
        speed: 0.7 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      })
    }

    const loader = new FontLoader()
    loader.load('/fonts/helvetiker_bold.typeface.json', (font) => {
      if (disposed) return
      const geo = new TextGeometry(PARAMS.textContent, {
        font, size: PARAMS.baseScale, height: PARAMS.textExtrusion, curveSegments: 4, bevelEnabled: false,
      })
      geo.computeBoundingBox()
      geo.translate(-geo.boundingBox.min.x, 0, 0)
      const mat = new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.95 })

      spokes.forEach((spoke) => {
        const mesh = new THREE.Mesh(geo, mat)
        mesh.scale.set(PARAMS.textScale.x, PARAMS.textScale.y, PARAMS.textScale.z)
        scene.add(mesh)
        strips.push({
          mesh, angle: spoke.angle, baseRadius: spoke.radius,
          baseZ: -Math.random() * 46, speed: spoke.speed, phase: spoke.phase,
        })
      })
      fontLoaded = true
    })

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1,1), PARAMS.bloomStrength, 0.4, 0.2))
    composer.addPass(new AfterimagePass(PARAMS.trailLength))
    composer.addPass(new FilmPass(PARAMS.grainStrength, false))

    const warpShader = {
      uniforms: {
        tDiffuse: { value: null },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uStrength: { value: PARAMS.blurAmount },
        uAberration: { value: PARAMS.aberrationIntensity },
        uVignette: { value: PARAMS.vignetteDarkness },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform vec2 uCenter; uniform float uStrength; uniform float uAberration; uniform float uVignette;
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
          float rr = texture2D(tDiffuse, vUv - dirNorm*aberr).r;
          float bb = texture2D(tDiffuse, vUv + dirNorm*aberr).b;
          float vignette = 1.0 - dist * uVignette * 0.35;
          gl_FragColor = vec4(rr, col.g, bb, 1.0) * vignette;
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
      if(fontLoaded){
        basisX.copy(flowDir)
        basisY.copy(worldUp).sub(basisX.clone().multiplyScalar(worldUp.dot(basisX))).normalize()
        basisZ.crossVectors(basisX, basisY).normalize()
        basisMatrix.makeBasis(basisX, basisY, basisZ)
        flowQuat.setFromRotationMatrix(basisMatrix)

        strips.forEach((strip)=>{
          strip.speed += (PARAMS.acceleration * 0.01) * dt
          strip.baseZ += strip.speed * PARAMS.flightSpeed * 10 * dt
          if(strip.baseZ > 7) strip.baseZ = -46
          const p = (strip.baseZ + 46) / 53
          const expansion = 0.2 + 0.8 * Math.pow(p, 1.5)
          strip.mesh.position.set(
            Math.cos(strip.angle) * strip.baseRadius * expansion,
            Math.sin(strip.angle) * strip.baseRadius * expansion,
            strip.baseZ
          )
          strip.mesh.quaternion.copy(flowQuat)
          const tail = 1.0 + p * PARAMS.tailStretch * 0.18
          strip.mesh.scale.set(PARAMS.textScale.x * tail, PARAMS.textScale.y, PARAMS.textScale.z)
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
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
      strips.forEach(({mesh})=> mesh.geometry.dispose())
      renderer.dispose()
      if(mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  },[])

  return <div ref={mountRef} className="warp-tunnel" style={{cursor:'grab'}} />
}
