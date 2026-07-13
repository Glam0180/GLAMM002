import React from 'react'
import './Tag.css'

export default function Tag({ children, color = 'gray', size = 'md' }) {
  return (
    <span className={`tag tag--${color} tag--${size}`}>
      <span className="tag__dot" />
      {children}
    </span>
  )
}
