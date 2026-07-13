export const cn = (...classes) => classes.filter(Boolean).join(' ')
export const padIndex = (n, d = 3) => String(n).padStart(d, '0')
export const slugify = str =>
  str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
