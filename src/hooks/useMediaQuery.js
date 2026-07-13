import { useState, useEffect } from 'react'

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const h = e => setMatches(e.matches)
    mql.addEventListener('change', h)
    return () => mql.removeEventListener('change', h)
  }, [query])
  return matches
}
