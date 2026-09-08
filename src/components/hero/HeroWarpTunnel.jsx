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

// PARAMETROS DE TUS CAPTURAS
const PARAMS = {
  flightSpeed: 0.1,        // Motion & Flow
  flowDir: { x: 0, y: 0, z: 0.2 },
  fieldSpread: 6,          // Field Spread
  acceleration: 5,
  particleDensity: 350,    // Particle Density
  baseScale: 0.3,          // Base Scale
  tailStretch: 10,         // Tail Stretch
  textContent: "GLAMGLAMGLAMGLAMGLAMGLAMGLAMGLMAGLMA GLMA", // de tu captura Typography
  textExtrusion: 0.05,     // Text Extrusion
  textScale: { x: 1.9, y: 4.3, z: 0.8 },
  trailLength: 0.75,       // Effects Motion & Light
  blurAmount: 0.35,        // Blur Amount
  bloomStrength: 1.4,      // Bloom Strength
  aberrationIntensity: 0.02,
  vignetteDarkness: 1.2,
  grainStrength: 0.06,
  voidColor: 0x000000,
}

export default function HeroWarpTunnel() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let raf = 0, disposed = false, fontLoaded = false

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(PARAMS.voidColor)

    const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 100)
    camera.position.set(0, 0, 6)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    mount.appendChild(renderer.domElement)

    const RED = new THREE.Color('#FF0000')
    const strips = []

    // Flow Direction de tu captura: X 0, Y 0, Z 0.2
    const flowDir = new THREE.Vector3(PARAMS.flowDir.x, PARAMS.flowDir.y, PARAMS.flowDir.z).normalize()
    if (flowDir.length() === 0) flowDir.set(0,0,1)
    const worldUp = new THREE.Vector3(0, 1, 0)
    const basisX = new THREE.Vector3(), basisY = new THREE.Vector3(), basisZ = new THREE.Vector3()
    const basisMatrix = new THREE.Matrix4()
    const flowQuat = new THREE.Quaternion()

    // Field Spread = 6 y Particle Density = 350
    const spokes = []
    for (let s = 0; s < PARAMS.particleDensity; s++) {
      const angle = (s / PARAMS.particleDensity) * Math.PI * 12 + Math.random() * 0.5
      spokes.push({
        angle,
        radius: Math.random() * PARAMS.fieldSpread,
        speed: 0.7 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      })
    }

    const loader = new FontLoader()
    loader.load('/fonts/helvetiker_bold.typeface.json', (font) => { // Optimer -> helvetiker es el mas cercano, cambia a optimer_bold si lo tienes
      if (disposed) return

      // 3D Text con extrusion 0.05 como en tu captura
      const geo = new TextGeometry(PARAMS.textContent, {
        font,
        size: PARAMS.baseScale,
        height: PARAMS.textExtrusion,
        curveSegments: 4,
        bevelEnabled: false,
      })
      geo.computeBoundingBox()
      geo.translate(-geo.boundingBox.min.x, 0, 0)

      const mat = new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.95 })

      spokes.forEach((spoke) => {
        const mesh = new THREE.Mesh(geo, mat)
        // Text Scale X 1.9 Y 4.3 Z 0.8 de tu captura
        mesh.scale.set(PARAMS.textScale.x, PARAMS.textScale.y, PARAMS.textScale.z)
        scene.add(mesh)
        strips.push({
          mesh,
          angle: spoke.angle,
          baseRadius: spoke.radius,
          baseZ: -Math.random() * 46,
          speed: spoke.speed,
          phase: spoke.phase,
        })
      })
      fontLoaded = true
    })

    // POST-PROCESO con tus valores
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1,1), PARAMS.bloomStrength, 0.4, 0.2)) // Bloom 1.4
    composer.addPass(new AfterimagePass(PARAMS.trailLength)) // Trail 0.75
    composer.addPass(new FilmPass(PARAMS.grainStrength, false)) // Grain 0.06

    const warpShader = {
      uniforms: {
        tDiffuse: { value: null },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uStrength: { value: PARAMS.blurAmount }, // Blur 0.35
        uAberration: { value: PARAMS.aberrationIntensity }, // 0.02
        uVignette: { value: PARAMS.vignetteDarkness }, // 1.2
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform vec2 uCenter; uniform float uStrength; uniform float uAberration; uniform float uVignette;
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
      const elapsed = clock.getElapsedTime()
      if(fontLoaded){
        basisX.copy(flowDir)
        basisY.copy(worldUp).sub(basisX.clone().multiplyScalar(worldUp.dot(basisX))).normalize()
        basisZ.crossVectors(basisX, basisY).normalize()
        basisMatrix.makeBasis(basisX, basisY, basisZ)
        flowQuat.setFromRotationMatrix(basisMatrix)

        strips.forEach((strip)=>{
          // Flight Speed 0.1 + Acceleration 5
          strip.speed += (PARAMS.acceleration * 0.01) * dt
          strip.baseZ += strip.speed * PARAMS.flightSpeed * 10 * dt
          if(strip.baseZ > 7) strip.baseZ = -46

          const p = (strip.baseZ + 46) / 53
          const expansion = 0.2 + 0.8 * Math.pow(p, 1.5)

          const jx = Math.sin(elapsed * 1.2 + strip.phase) * 0.05
          const jy = Math.cos(elapsed * 1.0 + strip.phase) * 0.05

          strip.mesh.position.set(
            Math.cos(strip.angle) * strip.baseRadius * expansion + jx,
            Math.sin(strip.angle) * strip.baseRadius * expansion + jy,
            strip.baseZ
          )
          strip.mesh.quaternion.copy(flowQuat)

          // Tail Stretch 10 + Text Scale
          const tail = 1.0 + p * PARAMS.tailStretch * 0.18
          strip.mesh.scale.set(
            PARAMS.textScale.x * tail,
            PARAMS.textScale.y,
            PARAMS.textScale.z
          )
        })
      }
      composer.render()
    }
    animate()

    return()=>{
      disposed=true; cancelAnimationFrame(raf); window.removeEventListener('resize',resize)
      strips.forEach(({mesh})=>{ mesh.geometry.dispose() })
      renderer.dispose()
      if(mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  },[])

  return <div ref={mountRef} className="warp-tunnel" />
}
