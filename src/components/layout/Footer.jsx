import React from 'react'
import { Link } from 'react-router-dom'
import { LAB_META, TOOLS } from '@constants/tools'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner page-container">

        {/* Ventana footer */}
        <div className="win footer__win">

          {/* Titlebar */}
          <div className="win__bar">
            <span className="win__bar-slash">///</span>
            <span className="win__bar-dot" />
            <span className="win__bar-title">/NOTAS AMANO LAB</span>
            <span className="win__bar-sep">|</span>
            <span className="win__bar-subtitle">FOOTER.SYS</span>
            <div className="win__bar-controls">
              <span className="win__ctrl">—</span>
              <span className="win__ctrl">□</span>
              <span className="win__ctrl win__ctrl--close">✕</span>
            </div>
            <span className="win__slashes">///</span>
          </div>

          {/* Body */}
          <div className="win__body footer__body">
            <div className="footer__grid">

              {/* Brand */}
              <div className="footer__brand">
                <Link to="/" className="footer__wordmark">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                    <rect x="2"  y="2" width="5" height="16" fill="currentColor"/>
                    <rect x="10" y="2" width="8" height="5"  fill="currentColor"/>
                    <rect x="10" y="11" width="8" height="7" fill="currentColor"/>
                  </svg>
                  {LAB_META.shortName}
                </Link>
                <p className="footer__tagline">{LAB_META.tagline}</p>
              </div>

              {/* Tools */}
              <div className="footer__col">
                <span className="footer__col-title">C:\TOOLS\</span>
                <ul className="footer__list">
                  {TOOLS.map(t => (
                    <li key={t.id}>
                      <Link to={t.path} className="footer__link">
                        <span className="footer__link-idx">{t.index}</span>
                        {t.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Info */}
              <div className="footer__col">
                <span className="footer__col-title">C:\DOCS\</span>
                <ul className="footer__list">
                  <li><span className="footer__link footer__link--off">README.md</span></li>
                  <li><span className="footer__link footer__link--off">CHANGELOG.txt</span></li>
                  <li><span className="footer__link footer__link--off">CONTRIBUTE.md</span></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Statusbar */}
          <div className="win__status">
            <span className="win__status-item win__status-item--red">● RUNNING</span>
            <span className="win__status-item">© {LAB_META.year} {LAB_META.name}</span>
            <span className="win__status-item" style={{marginLeft:'auto'}}>{LAB_META.version} — ALPHA</span>
          </div>
        </div>

      </div>
    </footer>
  )
}
