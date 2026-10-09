export function minsToLabel(mins) {
  const h24 = Math.floor(mins / 60) % 24
  const m = mins % 60
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`
}

export function nowMins() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}
