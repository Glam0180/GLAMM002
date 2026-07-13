import React, { useRef, useEffect } from 'react'
import './floralis.css'

export default function FloralisExperience() {
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
    <div className="floralis-wrapper">
      <iframe
        ref={iframeRef}
        src="/tools/floralis.html"
        className="floralis-iframe"
        title="Floralis — jardín libre"
        allow="camera; microphone"
        allowFullScreen
      />
    </div>
  )
}
