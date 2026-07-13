import React from 'react'
import { Link } from 'react-router-dom'
import './NotFound.css'

export default function NotFound() {
  return (
    <div className="nf page-enter">
      <div className="content-container">
        <div className="win nf__win">
          <div className="win__bar">
            <span className="win__bar-slash">///</span>
            <span className="win__bar-dot" />
            <span className="win__bar-title">/ERROR 404</span>
            <div className="win__bar-controls">
              <span className="win__ctrl">—</span>
              <span className="win__ctrl">□</span>
              <Link to="/" className="win__ctrl win__ctrl--close">✕</Link>
            </div>
            <span className="win__slashes">///</span>
          </div>
          <div className="win__body nf__body">
            <span className="nf__code">C:\ERROR\404.SYS</span>
            <h1 className="nf__title">Página no encontrada</h1>
            <p className="nf__desc">Esta ruta no existe en el laboratorio.</p>
            <Link to="/" className="nf__link">← /VOLVER AL INICIO</Link>
          </div>
          <div className="win__status">
            <span className="win__status-item win__status-item--red">● ERROR 404</span>
            <span className="win__status-item" style={{marginLeft:'auto'}}>RUTA NO ENCONTRADA</span>
          </div>
        </div>
      </div>
    </div>
  )
}
