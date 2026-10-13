import React, { useRef, useEffect } from 'react'
import './we-dont-belong.css'

export default function WeDontBelongExperience() {
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
    <div className="wdb-wrapper">
      <iframe
        ref={iframeRef}
        src="/tools/we-dont-belong.html"
        className="wdb-iframe"
        title="We Don't Belong"
        /* Necesario para que getUserMedia funcione dentro del iframe
           (control por manos), igual que en Daisy. */
        allow="camera; microphone"
        allowFullScreen
      />
    </div>
  )
}
