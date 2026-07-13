import React from 'react'
import { Link } from 'react-router-dom'
import { TOOL_STATUS } from '@constants/tools'
import './ToolPageShell.css'

export default function ToolPageShell({ tool, children }) {
  const { name, description, status, tech, index } = tool
  const statusInfo = TOOL_STATUS[status] || TOOL_STATUS.soon

  return (
    <section className="shell page-enter">
      <div className="content-container">

        {/* Ventana principal */}
        <div className="win shell__win">

          {/* Titlebar */}
          <div className="win__bar">
            <span className="win__bar-slash">///</span>
            <span className="win__bar-dot" />
            <Link to="/" className="win__bar-back">/NAL</Link>
            <span className="win__bar-sep">|</span>
            <span className="win__bar-title">/{name.toUpperCase()}</span>
            <span className="win__bar-sep">—</span>
            <span className="win__bar-subtitle">{index}/365</span>
            <div className="win__bar-controls">
              <span className="win__ctrl">—</span>
              <span className="win__ctrl">□</span>
              <Link to="/" className="win__ctrl win__ctrl--close" title="Cerrar">✕</Link>
            </div>
            <span className="win__slashes">///</span>
          </div>

          {/* Header info */}
          <div className="shell__header">
            <div className="shell__header-left">
              <span className={`shell__status shell__status--${statusInfo.color}`}>
                ● {statusInfo.label}
              </span>
              <h1 className="shell__title">{name}</h1>
              <p className="shell__desc">{description}</p>
            </div>
            <div className="shell__header-right">
              <span className="shell__tech-label">STACK.SYS</span>
              <ul className="shell__tech-list">
                {tech.map(t => (
                  <li key={t} className="shell__tech-item">{t}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Canvas área */}
          <div className="shell__canvas">
            {children ? children : (
              <div className="shell__placeholder">
                {/* Grid retro */}
                <div className="shell__ph-grid" aria-hidden="true">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="shell__ph-cell" />
                  ))}
                </div>
                <div className="shell__ph-center">
                  <span className="shell__ph-code">C:\TOOLS\{name.toUpperCase().replace(/\s/g,'_')}.EXE</span>
                  <p className="shell__ph-msg">— en desarrollo —</p>
                </div>
              </div>
            )}
          </div>

          {/* Statusbar */}
          <div className="win__status">
            <span className="win__status-item win__status-item--red">● {statusInfo.label.toUpperCase()}</span>
            <span className="win__status-item">{name.toUpperCase()}</span>
            <span className="win__status-item" style={{marginLeft:'auto'}}>
              {tech.join(' · ')}
            </span>
          </div>
        </div>

        {/* Volver */}
        <div className="shell__back">
          <Link to="/" className="shell__back-link">
            ← /VOLVER AL LABORATORIO
          </Link>
        </div>

      </div>
    </section>
  )
}
