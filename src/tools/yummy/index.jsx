import React, { useRef, useEffect } from 'react'
import './yummy.css'

export default function YummyExperience() {
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
    <div className="yum-wrapper">
      <iframe
        ref={iframeRef}
        src="/tools/yummy.html"
        className="yum-iframe"
        title="Yummy"
        /* Necesario para que getUserMedia funcione dentro del iframe
           (control por manos), igual que en Daisy. */
        allow="camera; microphone"
        allowFullScreen
      />
    </div>
  )
}
