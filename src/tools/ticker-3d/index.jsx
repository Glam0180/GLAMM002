import React, { useRef, useEffect } from 'react'
import './ticker-3d.css'

export default function Ticker3DExperience() {
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
    <div className="ticker3d-wrapper">
      <iframe
        ref={iframeRef}
        src="/tools/ticker-3d.html"
        className="ticker3d-iframe"
        title="Ticker 3D"
        /* display-capture: para «grabar toda la ventana» desde el iframe */
        allow="display-capture"
        allowFullScreen
      />
    </div>
  )
}
