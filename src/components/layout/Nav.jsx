import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { TOOLS } from '@constants/tools'
import './Nav.css'

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => { setMenuOpen(false) }, [location])

  const toolsCount = TOOLS.length

  return (
    <header className="nav">
      <div className="nav__row">

        {/* Izquierda */}
        <nav className="nav__group nav__group--left">
          <Link
            to="/"
            className={`nav__link ${location.pathname === '/' ? 'nav__link--active' : ''}`}
          >
            INICIO
          </Link>
          <Link to="/#tools" className="nav__link">
            HERRAMIENTAS <sub className="nav__count">({toolsCount})</sub>
          </Link>
        </nav>

        {/* Centro — logo (placeholder) */}
        <Link to="/" className="nav__logo" aria-label="GLAM.LAB — inicio">
          LOGO
        </Link>

        {/* Derecha */}
        <div className="nav__right">
          <nav className="nav__group nav__group--right">
            <span className="nav__link nav__link--off">ABOUT</span>
            <span className="nav__link nav__link--off">CONTACTO</span>
          </nav>

          <button
            type="button"
            className="nav__menu-btn"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(o => !o)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div className={`nav__drawer ${menuOpen ? 'nav__drawer--open' : ''}`}>
        <Link to="/" className="nav__drawer-link">INICIO</Link>
        <Link to="/#tools" className="nav__drawer-link">HERRAMIENTAS ({toolsCount})</Link>
        <span className="nav__drawer-link nav__drawer-link--off">ABOUT</span>
        <span className="nav__drawer-link nav__drawer-link--off">CONTACTO</span>
      </div>
    </header>
  )
}
