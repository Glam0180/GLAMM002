import React from 'react'
import { TOOLS } from '@constants/tools'
import ToolCard from '@components/ui/ToolCard'
import './Home.css'

export default function Home() {
  return (
    <div className="home">

      {/* ── HERO — en blanco, pendiente de diseño ── */}
      <section className="hero" aria-label="Hero — pendiente de diseño">
        <span className="hero__note">// HERO — PENDIENTE</span>
      </section>

      {/* ── HERRAMIENTAS ── */}
      <section className="tools-section" id="tools">
        <div className="tools-grid">
          {TOOLS.map((tool, i) => (
            <ToolCard key={tool.id} tool={tool} index={i + 1} />
          ))}
        </div>
      </section>

      {/* ── MANIFIESTO ── */}
      <section className="manifesto">
        <blockquote className="manifesto__quote">
          “DISEÑAR DESDE EL CÓDIGO.<br />
          EXPERIMENTAR SIN LÍMITES.<br />
          CONSTRUIR HERRAMIENTAS QUE PIENSEN.”
        </blockquote>
      </section>

    </div>
  )
}
