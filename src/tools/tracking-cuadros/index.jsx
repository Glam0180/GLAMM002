import React, { useRef, useEffect } from 'react'
import './tracking-cuadros.css'

export default function TrackingCuadrosExperience() {
  const iframeRef = useRef(null)

  useEffect(() => {
    function resize() {
      if (!iframeRef.current) return
      const top = iframeRef.current.getBoundingClientRect().top
      iframeRef.current.style.height = `${window.innerHeight - top - 1}px`
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  return (
    <div className="trk-wrapper">
      <iframe
        ref={iframeRef}
        src="/tools/tracking-cuadros.html"
        className="trk-iframe"
        title="Tracking en cuadros"
        /* display-capture: para «grabar toda la ventana» desde el iframe */
        allow="display-capture"
        allowFullScreen
      />
    </div>
  )
}
