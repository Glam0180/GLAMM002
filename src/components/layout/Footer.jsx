import React from 'react'
import { Link } from 'react-router-dom'
import { LAB_META } from '@constants/tools'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">

        {/* Izquierda — info */}
        <div className="footer__info">
          <nav className="footer__links">
            <Link to="/" className="footer__link">MAIN</Link>
            <a
              href="#"
              className="footer__link"
              target="_blank"
              rel="noopener noreferrer"
            >
              IG
            </a>
            <span className="footer__link">ABOUT</span>
            <span className="footer__link">RESUME</span>
          </nav>

          <div className="footer__meta">
            <span className="footer__meta-item">© {LAB_META.year} {LAB_META.name}</span>
            <span className="footer__meta-item">{LAB_META.version}</span>
          </div>
        </div>

        {/* Derecha — logo grande */}
        <Link to="/" className="footer__logo" aria-label="GLAM.LAB — inicio">
          <img src="/logo.svg" alt="GLAM.LAB" className="footer__logo-img" />
        </Link>

      </div>
    </footer>
  )
}
