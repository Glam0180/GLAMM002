import React, { useRef, useEffect } from 'react'
import './holocloth.css'

export default function HoloclothExperience() {
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
    <div className="holocloth-wrapper">
      <iframe
        ref={iframeRef}
        src="/tools/holocloth.html"
        className="holocloth-iframe"
        title="Holocloth"
        /* display-capture: para «grabar toda la ventana» desde el iframe */
        allow="display-capture"
        allowFullScreen
      />
    </div>
  )
}
