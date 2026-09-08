import { TOOLS } from '@constants/tools'
import ToolCard from '@components/ui/ToolCard'
import HeroWarpTunnel from '@components/hero/HeroWarpTunnel'
import './Home.css'

export default function Home() {
  return (
    <div className="home">

      <section className="hero" aria-label="Túnel de velocidad hiperespacial">
        <HeroWarpTunnel />
      </section>

      {/* ── HERRAMIENTAS ── */}
      <section className="tools-section" id="tools">
        <div className="tools-grid">
          {TOOLS.map((tool, i) => (
            <ToolCard key={tool.id} tool={tool} index={i + 1} />
          ))}
        </div>
      </section>

    </div>
  )
}
