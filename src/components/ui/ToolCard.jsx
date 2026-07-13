import React from 'react'
import { Link } from 'react-router-dom'
import { TOOL_STATUS } from '@constants/tools'
import './ToolCard.css'

export default function ToolCard({ tool }) {
  const { name, description, status, tech, path, index } = tool
  const statusInfo = TOOL_STATUS[status] || TOOL_STATUS.soon
  const isActive = status === 'live' || status === 'wip'

  return (
    <article className={`tc ${isActive ? 'tc--active' : 'tc--soon'}`}>
      <Link to={path} className="tc__inner" tabIndex={isActive ? 0 : -1}>

        {/* Mini titlebar */}
        <div className="tc__bar">
          <span className="tc__bar-slash">///</span>
          <span className="tc__bar-dot" />
          <span className="tc__bar-idx">{index}</span>
          <span className="tc__bar-sep">|</span>
          <span className={`tc__status tc__status--${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          <div className="tc__bar-ctrls">
            <span className="tc__ctrl">—</span>
            <span className="tc__ctrl">□</span>
            <span className="tc__ctrl tc__ctrl--x">✕</span>
          </div>
        </div>

        {/* Content */}
        <div className="tc__body">
          <h3 className="tc__name">{name}</h3>
          <p  className="tc__desc">{description}</p>
          <div className="tc__tech">
            {tech.map(t => (
              <span key={t} className="tc__tech-item">{t}</span>
            ))}
          </div>
        </div>

        {/* Statusbar */}
        <div className="tc__statusbar">
          <span className="tc__statusbar-txt">ABRIR →</span>
        </div>

      </Link>
    </article>
  )
}
