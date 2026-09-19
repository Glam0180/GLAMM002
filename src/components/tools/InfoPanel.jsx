import React, { useRef, useState, useEffect, useCallback } from 'react'
import './InfoPanel.css'

/**
 * InfoPanel — pestaña flotante de instrucciones ("qué hace esta
 * herramienta" + hasta 5 pasos), con el mismo look del system UI
 * (rojo/negro, Space Mono).
 *
 * El arrastre es 100% libre: no hay límites de contenedor ni zonas
 * excluidas, se puede soltar donde sea. Solo se calcula una posición
 * inicial razonable (afuera de la ventana de contenido) la primera vez
 * que aparece. Minimizar y cerrar hacen lo mismo: colapsan a una
 * burbuja "?" en el mismo lugar, que al hacer click reabre el panel.
 *
 * Props:
 *  - boundsRef: contenedor de referencia para la posición inicial
 *  - contentRef: ventana de contenido (para calcular esa posición inicial)
 */
export default function InfoPanel({ title = 'CÓMO USAR', whatItDoes, steps = [], boundsRef, contentRef }) {
  const panelRef = useRef(null)
  const bubbleRef = useRef(null)
  const drag = useRef({ dragging: false, offsetX: 0, offsetY: 0 })
  const userMoved = useRef(false)
  const [pos, setPos] = useState({ x: 14, y: 14 })
  const [bubblePos, setBubblePos] = useState({ x: 14, y: 14 })
  const [collapsed, setCollapsed] = useState(false)

  const computeDefaultPos = useCallback((w, h) => {
    const b = boundsRef?.current?.getBoundingClientRect()
    const c = contentRef?.current?.getBoundingClientRect()
    if (!b || !c) return { x: 14, y: 14 }
    const ex = { x: c.left - b.left, y: c.top - b.top, w: c.width, h: c.height }
    const roomRight = b.width - (ex.x + ex.w)
    const roomBelow = b.height - (ex.y + ex.h)
    if (roomRight >= w + 14) return { x: ex.x + ex.w + 8, y: ex.y + 8 }
    if (roomBelow >= h + 14) return { x: 8, y: ex.y + ex.h + 8 }
    return { x: 8, y: 8 }
  }, [boundsRef, contentRef])

  // Posición inicial (solo si el usuario no la ha movido a mano todavía)
  useEffect(() => {
    if (collapsed || userMoved.current) return
    const el = panelRef.current
    if (!el) return
    const raf1 = requestAnimationFrame(() => requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect()
      setPos(computeDefaultPos(rect.width, rect.height))
    }))
    return () => cancelAnimationFrame(raf1)
  }, [collapsed, computeDefaultPos])

  // ── Drag libre, sin restricciones ──
  useEffect(() => {
    function getPoint(e) {
      return e.touches && e.touches[0] ? e.touches[0] : e
    }

    function onMove(e) {
      if (!drag.current.dragging || !boundsRef?.current) return
      const point = getPoint(e)
      const b = boundsRef.current.getBoundingClientRect()
      const x = point.clientX - b.left - drag.current.offsetX
      const y = point.clientY - b.top - drag.current.offsetY
      setPos({ x, y })
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
  }, [boundsRef])

  function startDrag(e) {
    if (e.target.closest('.ip__ctrl')) return // no arrastrar al tocar — / ✕
    const point = e.touches && e.touches[0] ? e.touches[0] : e
    const rect = panelRef.current.getBoundingClientRect()
    drag.current.dragging = true
    userMoved.current = true
    drag.current.offsetX = point.clientX - rect.left
    drag.current.offsetY = point.clientY - rect.top
  }

  // Minimizar y Cerrar hacen lo mismo: colapsan a la burbuja "?"
  function collapse() {
    const rect = panelRef.current.getBoundingClientRect()
    const b = boundsRef?.current?.getBoundingClientRect()
    if (b) setBubblePos({ x: rect.left - b.left, y: rect.top - b.top })
    setCollapsed(true)
  }

  function expand() {
    const rect = bubbleRef.current.getBoundingClientRect()
    const b = boundsRef?.current?.getBoundingClientRect()
    if (b) setPos({ x: rect.left - b.left, y: rect.top - b.top })
    setCollapsed(false)
  }

  if (collapsed) {
    return (
      <div
        className="ip-bubble"
        ref={bubbleRef}
        style={{ left: bubblePos.x, top: bubblePos.y }}
        onClick={expand}
        role="button"
        aria-label="Mostrar instrucciones"
        title="Cómo usar esta herramienta"
      >
        ?
      </div>
    )
  }

  return (
    <div className="ip" ref={panelRef} style={{ left: pos.x, top: pos.y }}>
      <div className="ip__bar" onMouseDown={startDrag} onTouchStart={startDrag}>
        <span className="ip__slz">///</span>
        <span className="ip__dot" />
        <span className="ip__title">{title}</span>
        <div className="ip__ctrls">
          <span className="ip__ctrl" onClick={collapse} title="Minimizar">—</span>
          <span className="ip__ctrl" onClick={collapse} title="Cerrar">✕</span>
        </div>
      </div>
      <div className="ip__body">
        {whatItDoes && <p className="ip__desc">{whatItDoes}</p>}
        {steps.length > 0 && (
          <ol className="ip__steps">
            {steps.slice(0, 5).map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        )}
      </div>
    </div>
  )
}
