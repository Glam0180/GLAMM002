import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Nav.css'

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => { setMenuOpen(false) }, [location])

  return (
    <header className="nav">
      <div className="nav__row">

        {/* Izquierda */}
        <nav className="nav__group nav__group--left">
          <Link
            to="/"
            className={`nav__link ${location.pathname === '/' ? 'nav__link--active' : ''}`}
          >
            MAIN
          </Link>
          <a
            href="#"
            className="nav__link"
            target="_blank"
            rel="noopener noreferrer"
          >
            IG
          </a>
        </nav>

        {/* Centro — logo (svg) */}
        <Link to="/" className="nav__logo" aria-label="GLAM.LAB — inicio">
          <img src="/logo.svg" alt="GLAM.LAB" className="nav__logo-img" />
        </Link>

        {/* Derecha */}
        <div className="nav__right">
          <nav className="nav__group nav__group--right">
            <span className="nav__link">ABOUT</span>
            <span className="nav__link">RESUME</span>
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
        <Link to="/" className="nav__drawer-link">MAIN</Link>
        <a href="#" className="nav__drawer-link" target="_blank" rel="noopener noreferrer">IG</a>
        <span className="nav__drawer-link">ABOUT</span>
        <span className="nav__drawer-link">RESUME</span>
      </div>
    </header>
  )
}
