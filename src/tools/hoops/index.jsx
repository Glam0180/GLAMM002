import React, { useRef, useEffect } from 'react'
import './hoops.css'

export default function HoopsExperience() {
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
    <div className="hoops-wrapper">
      <iframe
        ref={iframeRef}
        src="/tools/hoops.html"
        className="hoops-iframe"
        title="Hoops"
        /* display-capture: para «grabar toda la ventana» desde el iframe */
        allow="display-capture"
        allowFullScreen
      />
    </div>
  )
}
