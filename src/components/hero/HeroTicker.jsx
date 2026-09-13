import './HeroTicker.css'

export default function HeroTicker({ position = 'top', reverse = false }) {
  const words = ['2026. Glam – Design Studio', 'Diseño Interactivo']
  // repetimos harto la secuencia para que el loop nunca se note un corte
  const sequence = Array.from({ length: 8 }, () => words).flat()

  return (
    <div className={`hero-ticker hero-ticker--${position}`} aria-hidden="true">
      <div className={`hero-ticker__track ${reverse ? 'hero-ticker__track--reverse' : ''}`}>
        {[0, 1].map((copy) => (
          <div className="hero-ticker__seq" key={copy}>
            {sequence.map((w, i) => (
              <span className="hero-ticker__item" key={i}>
                <span className="hero-ticker__text">{w}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
