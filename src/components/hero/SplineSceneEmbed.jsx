import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Spline from "@splinetool/react-spline"
import "./SplineSceneEmbed.css"

export function SplineSceneEmbed() {
  const splineAppRef = useRef(null)
  const sceneUrl = useMemo(
    () => "https://prod.spline.design/DZ8wO0Mo7M5Oo6WM/scene.splinecode",
    []
  )
  const clickStepRef = useRef(0)
  const [isPageVisible, setIsPageVisible] = useState(true)
  const audiosRef = useRef({})

  useEffect(() => {
    if (typeof window !== "undefined") {
      const entrada = new Audio(
        "https://auryfull.s3.us-east-2.amazonaws.com/Game_Bubble_Pop_Click.wav"
      )
      const salida = new Audio(
        "https://auryfull.s3.us-east-2.amazonaws.com/Game_Bubble_Pop_Click.wav"
      )

      entrada.preload = "auto"
      salida.preload = "auto"
      audiosRef.current = { entrada, salida }

      const onVisibilityChange = () => {
        const visible = document.visibilityState === "visible"
        startTransition(() => setIsPageVisible(visible))
        if (!visible) {
          entrada.pause()
          salida.pause()
        }
      }

      onVisibilityChange()
      document.addEventListener("visibilitychange", onVisibilityChange)

      return () => {
        document.removeEventListener("visibilitychange", onVisibilityChange)
        entrada.pause()
        salida.pause()
        entrada.src = ""
        salida.src = ""
        audiosRef.current = {}
      }
    }

    return undefined
  }, [])

  const handleClick = useCallback(() => {
    if (!isPageVisible) return

    const app = splineAppRef.current
    if (!app) return

    const currentStep = clickStepRef.current
    const { entrada, salida } = audiosRef.current

    if (currentStep === 0) {
      app.setVariable("white", 100)
      app.setVariable("red", 0)
      if (entrada) {
        entrada.currentTime = 0
        void entrada.play()
      }
    } else if (currentStep === 1) {
      app.setVariable("white", 0)
      app.setVariable("red", 100)
      if (salida) {
        salida.currentTime = 0
        void salida.play()
      }
    } else {
      app.setVariable("white", 0)
      app.setVariable("red", 0)
      if (salida) {
        salida.currentTime = 0
        void salida.play()
      }
    }

    clickStepRef.current = (currentStep + 1) % 3
  }, [isPageVisible])

  const handleLoad = useCallback((spline) => {
    if (splineAppRef.current === spline) return
    splineAppRef.current = spline
  }, [])

  return (
    <div className="spline-embed" onClick={handleClick}>
      <Spline scene={sceneUrl} onLoad={handleLoad} className="spline-embed__canvas" />
    </div>
  )
}

export default SplineSceneEmbed
