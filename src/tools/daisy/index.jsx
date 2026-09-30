import React, { useRef, useEffect } from 'react'
import './daisy.css'

export default function DaisyExperience() {
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
    <div className="daisy-wrapper">
      <iframe
        ref={iframeRef}
        src="/tools/daisy.html"
        className="daisy-iframe"
        title="Daisy — esqueleto en desarrollo"
        /* Sin esto, getUserMedia queda bloqueado por Permissions Policy
           dentro del iframe y el control por manos no puede arrancar.
           canicas-3d y floralis ya lo llevaban. */
        allow="camera; microphone"
        allowFullScreen
      />
    </div>
  )
}
