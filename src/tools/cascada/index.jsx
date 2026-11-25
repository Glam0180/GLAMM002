import React, { useRef, useEffect } from 'react'
import './cascada.css'

export default function CascadaExperience({ src = '/tools/cascada.html', title = 'Cascada' }) {
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
    <div className="cascada-wrapper">
      <iframe
        ref={iframeRef}
        src={src}
        className="cascada-iframe"
        title={title}
        /* display-capture: para «grabar toda la ventana» desde el iframe */
        allow="display-capture"
        allowFullScreen
      />
    </div>
  )
}
