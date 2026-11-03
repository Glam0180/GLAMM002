import React, { useRef, useEffect } from 'react'
import './corredor.css'

export default function CorredorExperience() {
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
    <div className="corredor-wrapper">
      <iframe
        ref={iframeRef}
        src="/tools/corredor.html"
        className="corredor-iframe"
        title="Corredor"
        /* display-capture: para «grabar toda la ventana» desde el iframe */
        allow="display-capture"
        allowFullScreen
      />
    </div>
  )
}
