import React, { useRef, useState, useEffect, useCallback } from 'react'
import './InfoPanel.css'

/**
 * InfoPanel — pestaña flotante de instrucciones ("qué hace esta
 * herramienta" + hasta 5 pasos), con el mismo look del system UI
 * (rojo/negro, Space Mono).
 *
 * Vive FUERA del área de contenido de la herramienta (`contentRef`,
 * el "canvas"/viewport): nunca puede arrastrarse encima de ella, se
 * empuja siempre al borde más cercano por fuera. Minimizar y cerrar
 * hacen lo mismo: colapsan a una pequeña burbuja "?" en el mismo
 * lugar, que al hacer click reabre el panel donde estaba.
 *
 * Props:
 *  - boundsRef: contenedor donde se puede mover (position:relative)
 *  - contentRef: elemento que el panel NUNCA debe tapar
 */
export default function InfoPanel({ title = 'CÓMO USAR', whatItDoes, steps = [], boundsRef, contentRef }) {
  const panelRef = useRef(null)
  const bubbleRef = useRef(null)
  const drag = useRef({ dragging: false, offsetX: 0, offsetY: 0 })
  const userMoved = useRef(false)
  const [pos, setPos] = useState({ x: 14, y: 14 })
  const [bubblePos, setBubblePos] = useState({ x: 14, y: 14 })
  const [collapsed, setCollapsed] = useState(false)

  const contentRectRel = useCallback(() => {
    const b = boundsRef?.current?.getBoundingClientRect()
    const c = contentRef?.current?.getBoundingClientRect()
    if (!b || !c) return null
    return { x: c.left - b.left, y: c.top - b.top, w: c.width, h: c.height }
  }, [boundsRef, contentRef])

  const clampOutside = useCallback((x, y, w, h) => {
    const b = boundsRef?.current?.getBoundingClientRect()
    if (!b) return { x, y }
    x = Math.max(0, Math.min(b.width - w, x))
    y = Math.max(0, Math.min(b.height - h, y))
    const ex = contentRectRel()
    if (ex) {
      const overlapX = x < ex.x + ex.w && x + w > ex.x
      const overlapY = y < ex.y + ex.h && y + h > ex.y
      if (overlapX && overlapY) {
        const pushLeft = (x + w) - ex.x
        const pushRight = (ex.x + ex.w) - x
        const pushUp = (y + h) - ex.y
        const pushDown = (ex.y + ex.h) - y
        const min = Math.min(pushLeft, pushRight, pushUp, pushDown)
        if (min === pushRight) x = ex.x + ex.w
        else if (min === pushDown) y = ex.y + ex.h
        else if (min === pushLeft) x = ex.x - w
        else y = ex.y - h
        x = Math.max(0, Math.min(b.width - w, x))
        y = Math.max(0, Math.min(b.height - h, y))
      }
    }
    return { x, y }
  }, [boundsRef, contentRectRel])

  const computeDefaultPos = useCallback((w, h) => {
    const b = boundsRef?.current?.getBoundingClientRect()
    const ex = contentRectRel()
    if (!b || !ex) return { x: 14, y: 14 }
    const roomRight = b.width - (ex.x + ex.w)
    const roomBelow = b.height - (ex.y + ex.h)
    if (roomRight >= w + 14) return { x: ex.x + ex.w + 8, y: ex.y + 8 }
    if (roomBelow >= h + 14) return { x: 8, y: ex.y + ex.h + 8 }
    return clampOutside(8, 8, w, h)
  }, [boundsRef, contentRectRel, clampOutside])

  // Posición inicial + recalcular en resize (si el usuario no la movió a mano)
  useEffect(() => {
    function place() {
      const el = collapsed ? bubbleRef.current : panelRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      if (collapsed) {
        setBubblePos((p) => clampOutside(p.x, p.y, rect.width, rect.height))
      } else if (!userMoved.current) {
        setPos(computeDefaultPos(rect.width, rect.height))
      } else {
        setPos((p) => clampOutside(p.x, p.y, rect.width, rect.height))
      }
    }
    const raf1 = requestAnimationFrame(() => requestAnimationFrame(place))
    window.addEventListener('resize', place)
    return () => {
      cancelAnimationFrame(raf1)
      window.removeEventListener('resize', place)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed])

  useEffect(() => {
    function getPoint(e) {
      return e.touches && e.touches[0] ? e.touches[0] : e
    }

    function onMove(e) {
      if (!drag.current.dragging || !panelRef.current) return
      const point = getPoint(e)
      const b = boundsRef?.current?.getBoundingClientRect()
      if (!b) return
      const pw = panelRef.current.offsetWidth
      const ph = panelRef.current.offsetHeight
      const x = point.clientX - b.left - drag.current.offsetX
      const y = point.clientY - b.top - drag.current.offsetY
      setPos(clampOutside(x, y, pw, ph))
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
  }, [boundsRef, clampOutside])

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
    if (b) setPos(clampOutside(rect.left - b.left, rect.top - b.top, panelRef.current?.offsetWidth || 200, panelRef.current?.offsetHeight || 120))
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
