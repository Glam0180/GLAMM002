import React from 'react'
import { TOOLS, LAB_META } from '@constants/tools'
import ToolCard from '@components/ui/ToolCard'
import './Home.css'

export default function Home() {
  const liveCount = TOOLS.filter(t => t.status === 'live').length
  const wipCount  = TOOLS.filter(t => t.status === 'wip').length

  return (
    <div className="home page-enter">

      {/* ── HERO WINDOW ── */}
      <section className="hero page-container">
        <div className="win hero__win">

          {/* Titlebar */}
          <div className="win__bar">
            <span className="win__bar-slash">///</span>
            <span className="win__bar-dot" />
            <span className="win__bar-title">/FIRST LOVE</span>
            <span className="win__bar-sep">|</span>
            <span className="win__bar-subtitle">NOTAS AMANO LAB — DISEÑO GRÁFICO INTERACTIVO</span>
            <div className="win__bar-controls">
              <span className="win__ctrl">—</span>
              <span className="win__ctrl">□</span>
              <span className="win__ctrl win__ctrl--close">✕</span>
            </div>
            <span className="win__slashes">///</span>
          </div>

          {/* Body */}
          <div className="win__body hero__body">
            <div className="hero__content">
              <div className="hero__eyebrow">
                <span className="hero__eyebrow-line" />
                <span className="hero__eyebrow-txt">laboratorio de diseño gráfico interactivo</span>
              </div>

              <h1 className="hero__title">
                <span className="hero__title-w">NOTAS</span>
                <span className="hero__title-w hero__title-w--red">AMANO</span>
                <span className="hero__title-w">LAB</span>
              </h1>

              <p className="hero__desc">
                Un entorno de experimentación donde el diseño gráfico
                y la tecnología se cruzan. Cada herramienta es una
                experiencia creativa independiente.
              </p>

              <div className="hero__stats">
                <div className="hero__stat">
                  <span className="hero__stat-n">{TOOLS.length}</span>
                  <span className="hero__stat-l">TOTAL.SYS</span>
                </div>
                <span className="hero__stat-sep" />
                <div className="hero__stat">
                  <span className="hero__stat-n hero__stat-n--red">{liveCount}</span>
                  <span className="hero__stat-l">LIVE.EXE</span>
                </div>
                <span className="hero__stat-sep" />
                <div className="hero__stat">
                  <span className="hero__stat-n">{wipCount}</span>
                  <span className="hero__stat-l">WIP.TMP</span>
                </div>
              </div>
            </div>

            {/* Deco marca */}
            <div className="hero__mark" aria-hidden="true">
              <svg viewBox="0 0 160 160" fill="none">
                <rect x="0"   y="0"   width="64" height="160" stroke="currentColor" strokeWidth="1"/>
                <rect x="96"  y="0"   width="64" height="64"  stroke="currentColor" strokeWidth="1"/>
                <rect x="96"  y="96"  width="64" height="64"  stroke="currentColor" strokeWidth="1"/>
                <line x1="64" y1="0" x2="64" y2="160" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"/>
                <rect x="0"  y="0"   width="16" height="16" fill="currentColor"/>
                <rect x="144" y="144" width="16" height="16" fill="currentColor"/>
              </svg>
            </div>
          </div>

          {/* Statusbar */}
          <div className="win__status">
            <span className="win__status-item win__status-item--red">● SISTEMA ACTIVO</span>
            <span className="win__status-item">v{LAB_META.version}</span>
            <span className="win__status-item" style={{marginLeft:'auto'}}>ALPHA BUILD — 2025</span>
          </div>
        </div>
      </section>

      {/* ── TOOLS WINDOW ── */}
      <section className="tools-section page-container" id="tools">
        <div className="win tools-section__win">

          {/* Titlebar */}
          <div className="win__bar">
            <span className="win__bar-slash">///</span>
            <span className="win__bar-dot" />
            <span className="win__bar-title">/HERRAMIENTAS</span>
            <span className="win__bar-sep">|</span>
            <span className="win__bar-subtitle">C:\TOOLS\ — {String(TOOLS.length).padStart(2,'0')} ARCHIVOS</span>
            <div className="win__bar-controls">
              <span className="win__ctrl">—</span>
              <span className="win__ctrl">□</span>
              <span className="win__ctrl win__ctrl--close">✕</span>
            </div>
            <span className="win__slashes">///</span>
          </div>

          {/* Grid */}
          <div className="win__body">
            <div className="tools-grid stagger">
              {TOOLS.map(tool => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </div>

          <div className="win__status">
            <span className="win__status-item">{liveCount} ACTIVAS</span>
            <span className="win__status-item">{wipCount} EN DESARROLLO</span>
            <span className="win__status-item" style={{marginLeft:'auto'}}>{TOOLS.length - liveCount - wipCount} PRÓXIMAS</span>
          </div>
        </div>
      </section>

      {/* ── MANIFESTO WINDOW ── */}
      <section className="manifesto page-container">
        <div className="win manifesto__win">
          <div className="win__bar">
            <span className="win__bar-slash">///</span>
            <span className="win__bar-dot" />
            <span className="win__bar-title">/MANIFIESTO.TXT</span>
            <div className="win__bar-controls">
              <span className="win__ctrl">—</span>
              <span className="win__ctrl">□</span>
              <span className="win__ctrl win__ctrl--close">✕</span>
            </div>
            <span className="win__slashes">///</span>
          </div>
          <div className="win__body manifesto__body">
            <blockquote className="manifesto__quote">
              "Diseñar desde el código.<br />
              Experimentar sin límites.<br />
              Construir herramientas que piensen."
            </blockquote>
          </div>
        </div>
      </section>

    </div>
  )
}
