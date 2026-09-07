import './HeroTapeScene.css'

export default function HeroTapeScene() {
  return (
    <div className="hero-tape" aria-label="Cinta roja enrollada">
      <div className="hero-tape__halo" aria-hidden="true" />
      <svg className="hero-tape__art" viewBox="0 0 1600 700" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="tape-red" x1="0" y1="0" x2="0.2" y2="1">
            <stop offset="0" stopColor="#ff5a5a" />
            <stop offset="0.18" stopColor="#ff171f" />
            <stop offset="0.55" stopColor="#d90510" />
            <stop offset="1" stopColor="#690007" />
          </linearGradient>
          <linearGradient id="tape-edge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5d0005" />
            <stop offset="0.52" stopColor="#ff5961" />
            <stop offset="1" stopColor="#600005" />
          </linearGradient>
          <radialGradient id="tape-roll" cx="34%" cy="26%" r="74%">
            <stop offset="0" stopColor="#ff7474" />
            <stop offset="0.24" stopColor="#ee111c" />
            <stop offset="0.66" stopColor="#92000a" />
            <stop offset="1" stopColor="#310003" />
          </radialGradient>
          <filter id="tape-shadow" x="-20%" y="-30%" width="140%" height="180%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="14" result="blur" />
            <feOffset dy="18" result="offset" />
            <feComponentTransfer><feFuncA type="linear" slope="0.75" /></feComponentTransfer>
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <path className="hero-tape__shadow" d="M -80 525 C 190 635 300 245 566 398 S 960 645 1235 322" />
        <path className="hero-tape__ribbon" d="M -80 505 C 190 615 300 225 566 378 S 960 625 1235 302" />
        <path className="hero-tape__highlight" d="M -80 461 C 190 571 300 181 566 334 S 960 581 1235 258" />
        <path className="hero-tape__edge" d="M -80 550 C 190 660 300 270 566 423 S 960 670 1235 347" />

        <g className="hero-tape__roll" transform="translate(1258 265) rotate(-16)">
          <ellipse cx="-35" cy="40" rx="162" ry="134" fill="#250003" opacity="0.85" />
          <circle r="143" fill="url(#tape-roll)" filter="url(#tape-shadow)" />
          <circle r="105" fill="none" stroke="#ff5961" strokeOpacity="0.44" strokeWidth="5" />
          <circle r="79" fill="#3a0004" stroke="#f9343e" strokeOpacity="0.66" strokeWidth="8" />
          <circle r="54" fill="#070707" stroke="#751019" strokeWidth="11" />
          <circle r="24" fill="#180002" stroke="#ff4b55" strokeOpacity="0.55" strokeWidth="5" />
          <path d="M -92 -87 C -52 -126 20 -139 71 -110" fill="none" stroke="#ffb1b3" strokeOpacity="0.45" strokeLinecap="round" strokeWidth="12" />
        </g>
      </svg>
    </div>
  )
}
