import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LAB_META, TOOLS } from '@constants/tools'
import './Nav.css'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [location])

  // Título dinámico según ruta
  const currentTool = TOOLS.find(t => location.pathname.includes(t.slug))
  const pageTitle = currentTool ? currentTool.name.toUpperCase() : 'HOME'

  return (
    <header className={`nav ${scrolled ? 'nav--scrolled' : ''}`}>

      {/* ── Barra tipo Windows ── */}
      <div className="nav__bar page-container">

        {/* Lado izquierdo */}
        <div className="nav__bar-left">
          <span className="nav__slash">///</span>
          <Link to="/" className="nav__dot-link" title="Inicio">
            <span className="nav__dot" />
          </Link>
          <span className="nav__sep">|</span>
          <span className="nav__section">/FIRST LOVE</span>
          <span className="nav__sep">|</span>
          <span className="nav__globe">⊕</span>
          <Link to={currentTool ? currentTool.path : '/'} className="nav__page-title">
            /{pageTitle}
          </Link>
        </div>

        {/* Lado derecho — controles de ventana */}
        <div className="nav__bar-right">
          <span className="nav__ctrl">—</span>
          <span className="nav__ctrl">□</span>
          <span className="nav__ctrl nav__ctrl--close" onClick={() => {}}>✕</span>
          <span className="nav__slash nav__slash--right">///</span>
        </div>
      </div>

      {/* ── Sub-barra de navegación ── */}
      <div className="nav__sub page-container">
        <nav className="nav__links">
          <Link to="/"       className={`nav__link ${location.pathname === '/' ? 'nav__link--active' : ''}`}>inicio</Link>
          <span className="nav__sub-sep">/</span>
          <Link to="/#tools" className="nav__link">herramientas</Link>
          <span className="nav__sub-sep">/</span>
          <span className="nav__link nav__link--off">about</span>
        </nav>
        <span className="nav__version">v{LAB_META.version} — BETA</span>
      </div>

      {/* Mobile drawer */}
      <div className={`nav__drawer ${menuOpen ? 'nav__drawer--open' : ''}`}>
        <Link to="/"       className="nav__drawer-link">/ inicio</Link>
        <Link to="/#tools" className="nav__drawer-link">/ herramientas</Link>
        <span              className="nav__drawer-link nav__drawer-link--off">/ about</span>
      </div>

    </header>
  )
}
