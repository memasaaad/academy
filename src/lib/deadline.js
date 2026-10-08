// نص موعد التسليم بصيغة مفهومة: "ينتهي غدًا — الموعد النهائي: 9 أكتوبر – 11:59 م" / "باقي ساعتان"
const fmt = (d, o) => new Date(d).toLocaleString('ar-EG', o)
export const exact = d => `${fmt(d, { day: 'numeric', month: 'long' })} – ${fmt(d, { hour: 'numeric', minute: '2-digit', hour12: true })}`
const plural = (n, one, two, few, many) => n === 1 ? one : n === 2 ? two : n <= 10 ? `${n.toLocaleString('ar-EG')} ${few}` : `${n.toLocaleString('ar-EG')} ${many}`
export function deadlineInfo(ends, now = Date.now()) {
  if (!ends) return null
  const ms = new Date(ends).getTime() - now, m = Math.floor(ms / 60000), h = Math.floor(ms / 3600000)
  if (ms <= 0) return { text: 'انتهى الموعد', tone: 'danger', level: 3, soon: false }
  if (m < 60) return { text: `⚠️ باقي ${plural(m, 'دقيقة', 'دقيقتان', 'دقائق', 'دقيقة')} على انتهاء الواجب`, tone: 'danger', level: 3, soon: true }
  if (h < 3) return { text: `⚠️ باقي ${plural(h, 'ساعة', 'ساعتان', 'ساعات', 'ساعة')} على انتهاء الواجب`, tone: 'danger', level: 3, soon: true }
  if (h < 24) return { text: `باقي ${plural(h, 'ساعة', 'ساعتان', 'ساعات', 'ساعة')} — الموعد النهائي: ${exact(ends)}`, tone: 'warning', level: 2, soon: true }
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1)
  if (new Date(ends).toDateString() === tomorrow.toDateString() || h < 48) return { text: `ينتهي غدًا — الموعد النهائي: ${exact(ends)}`, tone: 'warning', level: 1, soon: true }
  return { text: `ينتهي ${exact(ends)}`, tone: 'neutral', level: 0, soon: false }
}
