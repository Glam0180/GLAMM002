import React, { useRef, useEffect } from 'react'
import './canicas-3d.css'

export default function CanicasExperience() {
  const iframeRef = useRef(null)

  useEffect(() => {
    function resize() {
      if (!iframeRef.current) return
      const top = iframeRef.current.getBoundingClientRect().top
      // Calcula el alto restante de la pantalla menos 1px de margen
      iframeRef.current.style.height = `${window.innerHeight - top - 1}px`
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  return (
    <div className="canicas-wrapper">
      <iframe
        ref={iframeRef}
        src="/tools/canicas-3d.html"
        className="canicas-iframe"
        title="Canicas 3D — física interactiva"
        allow="camera; microphone"
        allowFullScreen
      />
    </div>
  )
}