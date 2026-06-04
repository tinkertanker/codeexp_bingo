/** Format a timestamp or Date as DD/MM/YYYY, HH:MM */
export function formatDate(value: number | Date): string {
  const d = typeof value === 'number' ? new Date(value) : value
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy}, ${hh}:${min}`
}

/** Format a timestamp or Date as HH:MM */
export function formatTime(value: number | Date): string {
  const d = typeof value === 'number' ? new Date(value) : value
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${min}`
}
