import { useEffect, useRef } from 'react'
import { TOOLS } from '@constants/tools'
import ToolCard from '@components/ui/ToolCard'
import HeroWarpTunnel from '@components/hero/HeroWarpTunnel'
import HeroTicker from '@components/hero/HeroTicker'
import './Home.css'

export default function Home() {
  const gridRef = useRef(null)

  // Fade-in de cada pieza al entrar en pantalla (scroll reveal)
  useEffect(() => {
    const items = gridRef.current
      ? gridRef.current.querySelectorAll('.tc')
      : []

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('tc--visible')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    )

    // Al acabar el fade-in se suelta el will-change de esa pieza, para no
    // mantener 8 capas de GPU vivas durante toda la sesión.
    const onSettled = (e) => {
      if (e.propertyName === 'opacity') e.currentTarget.classList.add('tc--settled')
    }

    items.forEach((el) => {
      io.observe(el)
      el.addEventListener('transitionend', onSettled)
    })

    return () => {
      io.disconnect()
      items.forEach((el) => el.removeEventListener('transitionend', onSettled))
    }
  }, [])

  return (
    <div className="home">

      {/* Hero fijo al viewport: los proyectos scrollean por encima */}
      <section className="hero" aria-label="Túnel de velocidad hiperespacial">
        <HeroWarpTunnel />
        <HeroTicker position="top" />
        <HeroTicker position="bottom" reverse />
      </section>

      {/* Reserva el alto del hero en el flujo del documento */}
      <div className="hero-spacer" aria-hidden="true" />

      {/* ── HERRAMIENTAS ── */}
      <section className="tools-section" id="tools">
        <div className="tools-grid" ref={gridRef}>
          {TOOLS.map((tool, i) => (
            <ToolCard key={tool.id} tool={tool} index={i + 1} />
          ))}
        </div>
      </section>

    </div>
  )
}
