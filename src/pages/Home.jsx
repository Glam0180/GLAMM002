import React, { Suspense, lazy } from 'react'
import { TOOLS } from '@constants/tools'
import ToolCard from '@components/ui/ToolCard'
import './Home.css'

const SplineSceneEmbed = lazy(() =>
  import('@components/hero/SplineSceneEmbed').then(m => ({ default: m.SplineSceneEmbed }))
)

export default function Home() {
  return (
    <div className="home">

      {/* ── HERO — escena 3D interactiva (Spline) ── */}
      <section className="hero" aria-label="Hero — escena interactiva">
        <div className="hero__embed">
          <Suspense fallback={<div className="hero__loading">// CARGANDO ESCENA</div>}>
            <SplineSceneEmbed />
          </Suspense>
        </div>
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
