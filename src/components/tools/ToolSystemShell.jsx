import React, { useRef } from 'react'
import { Link } from 'react-router-dom'
import InfoPanel from './InfoPanel'
import './ToolSystemShell.css'

/**
 * ToolSystemShell — el mismo "system UI" (master-bar rojo/negro, Space Mono,
 * ventana retro) que se usa en Canicas 3D y Daisy, pero como componente React
 * reutilizable para las herramientas que viven dentro del Layout normal del
 * sitio (con Nav y Footer), en vez de duplicar HTML estático por cada una.
 *
 * Si no se le pasan `children`, muestra el mismo placeholder/esqueleto que
 * Daisy ("EN DESARROLLO"). Si se le pasan `children` (p. ej. una experiencia
 * ya funcional como Floralis), los muestra dentro de la ventana, manteniendo
 * el mismo look & feel para todo el laboratorio.
 *
 * `whatItDoes` (string) y `steps` (array, máx. 5) alimentan el InfoPanel
 * flotante: vive FUERA de la ventana de contenido (`.tss__frame`, el
 * "canvas" de la herramienta) y solo puede arrastrarse por fuera de ella.
 */
export default function ToolSystemShell({ tool, children, whatItDoes, steps }) {
  const name = tool?.name || 'HERRAMIENTA'
  const subLabel = children ? name.toUpperCase() : `${name.toUpperCase()} — EN DESARROLLO`
  const boundsRef = useRef(null)
  const frameRef = useRef(null)

  return (
    <section className="tss" ref={boundsRef}>
      <div className="tss__master-bar">
        <span className="tss__slz">///</span>
        <div className="tss__dot5" />
        <Link to="/" className="tss__mhouse" aria-label="Volver al inicio" title="Volver al inicio">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </Link>
        <span className="tss__mtitle">STUDIO GLAM</span>
        <span className="tss__msep">—</span>
        <span className="tss__msub">{name}</span>
        <div className="tss__mright">
          <span className="tss__mctrl">—</span>
          <span className="tss__mctrl">□</span>
          <Link to="/" className="tss__mctrl tss__mctrl--close" aria-label="Cerrar y volver al inicio" title="Cerrar">✕</Link>
        </div>
        <span className="tss__slz">///</span>
      </div>

      <div className="tss__stage">
        <div className="tss__frame" ref={frameRef}>
          <div className="tss__win">
            <div className="tss__win-bar">
              <span className="tss__slz">///</span>
              <div className="tss__win-dot" />
              <span className="tss__win-title">VIEWPORT.{name.toUpperCase().replace(/\s+/g, '_')}</span>
              <span className="tss__win-sub">{subLabel}</span>
              <div className="tss__win-controls">
                <span className="tss__win-ctrl">—</span>
                <span className="tss__win-ctrl">□</span>
                <Link to="/" className="tss__win-ctrl" aria-label="Cerrar" title="Cerrar">✕</Link>
              </div>
            </div>

            <div className="tss__body">
              {children ? children : (
                <div className="tss__skeleton">
                  <div className="tss__skeleton-grid" aria-hidden="true">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div key={i} className="tss__skeleton-cell" />
                    ))}
                  </div>
                  <div className="tss__skeleton-center">
                    <span className="tss__skeleton-code">
                      C:\TOOLS\{name.toUpperCase().replace(/\s+/g, '_')}.EXE
                    </span>
                    <span className="tss__skeleton-msg">— en desarrollo —</span>
                  </div>
                </div>
              )}
            </div>

            <div className="tss__statusbar">
              <span><span className="tss__dot-live" />{children ? 'LIVE' : 'EN CURSO'}</span>
              <span>{name.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>

      {(whatItDoes || (steps && steps.length > 0)) && (
        <InfoPanel
          title={`cómo usar — ${name.toLowerCase()}`}
          whatItDoes={whatItDoes}
          steps={steps}
          boundsRef={boundsRef}
          contentRef={frameRef}
        />
      )}
    </section>
  )
}
