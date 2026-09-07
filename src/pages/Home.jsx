import { TOOLS } from '@constants/tools'
import ToolCard from '@components/ui/ToolCard'
import HeroTapeScene from '@components/hero/HeroTapeScene'
import './Home.css'

export default function Home() {
  return (
    <div className="home">

      <section className="hero" aria-label="Escenario de cinta roja">
        <HeroTapeScene />
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
