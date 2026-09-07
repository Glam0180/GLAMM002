import React from 'react'
import { Link } from 'react-router-dom'
import './ToolCard.css'

export default function ToolCard({ tool, index }) {
  const { name, path, thumbnail, status } = tool
  const isActive = status === 'live' || status === 'wip'
  const num = String(index).padStart(3, '0')

  const media = (
    <div className="tc__media">
      {thumbnail
        ? <img src={thumbnail} alt={name} className="tc__img" />
        : <div className="tc__placeholder" aria-hidden="true" />
      }
    </div>
  )

  const label = (
    <div className="tc__label">
      <span className="tc__slz">///</span>
      <span className="tc__num">{num}</span>
      <span className="tc__name">{name}</span>
      <span className="tc__slz tc__slz--end">///</span>
    </div>
  )

  return (
    <article className="tc">
      {isActive ? (
        <Link to={path} className="tc__inner">
          {label}
          {media}
        </Link>
      ) : (
        <div className="tc__inner tc__inner--soon">
          {label}
          {media}
        </div>
      )}
    </article>
  )
}
