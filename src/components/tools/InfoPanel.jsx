import React, { useRef, useState, useEffect } from 'react'
import './InfoPanel.css'

/**
 * InfoPanel — pestaña flotante de instrucciones ("qué hace esta
 * herramienta" + hasta 5 pasos), con el mismo look del system UI
 * (rojo/negro, Space Mono). Se puede arrastrar por todo el lienzo,
 * minimizar (deja solo la barra) y cerrar (deja un botón "?" para
 * volver a abrirla).
 */
export default function InfoPanel({ title = 'CÓMO USAR', whatItDoes, steps = [] }) {
  const panelRef = useRef(null)
  const drag = useRef({ dragging: false, offsetX: 0, offsetY: 0 })
  const [minimized, setMinimized] = useState(false)
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    function getPoint(e) {
      return e.touches && e.touches[0] ? e.touches[0] : e
    }

    function onMove(e) {
      if (!drag.current.dragging || !panelRef.current) return
      const point = getPoint(e)
      const parent = panelRef.current.offsetParent
      if (!parent) return
      const parentRect = parent.getBoundingClientRect()
      const pw = panelRef.current.offsetWidth
      const ph = panelRef.current.offsetHeight
      let x = point.clientX - parentRect.left - drag.current.offsetX
      let y = point.clientY - parentRect.top - drag.current.offsetY
      x = Math.max(0, Math.min(parentRect.width - pw, x))
      y = Math.max(0, Math.min(parentRect.height - ph, y))
      panelRef.current.style.left = x + 'px'
      panelRef.current.style.top = y + 'px'
      if (e.cancelable) e.preventDefault()
    }

    function onUp() {
      drag.current.dragging = false
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [])

  function startDrag(e) {
    if (e.target.closest('.ip__ctrl')) return // no arrastrar al tocar — / ✕
    const point = e.touches && e.touches[0] ? e.touches[0] : e
    const rect = panelRef.current.getBoundingClientRect()
    drag.current.dragging = true
    drag.current.offsetX = point.clientX - rect.left
    drag.current.offsetY = point.clientY - rect.top
  }

  if (closed) {
    return (
      <button
        className="ip-reopen"
        onClick={() => setClosed(false)}
        aria-label="Mostrar instrucciones"
        title="Cómo usar esta herramienta"
      >
        ?
      </button>
    )
  }

  return (
    <div className="ip" ref={panelRef}>
      <div className="ip__bar" onMouseDown={startDrag} onTouchStart={startDrag}>
        <span className="ip__slz">///</span>
        <span className="ip__dot" />
        <span className="ip__title">{title}</span>
        <div className="ip__ctrls">
          <span className="ip__ctrl" onClick={() => setMinimized(m => !m)} title="Minimizar">—</span>
          <span className="ip__ctrl" onClick={() => setClosed(true)} title="Cerrar">✕</span>
        </div>
      </div>
      {!minimized && (
        <div className="ip__body">
          {whatItDoes && <p className="ip__desc">{whatItDoes}</p>}
          {steps.length > 0 && (
            <ol className="ip__steps">
              {steps.slice(0, 5).map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}
