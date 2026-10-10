import { sb } from './supabase'
// قناة Realtime Presence واحدة للتطبيق كله: كل مستخدم مسجّل يُعلن وجوده، ولوحة المدرس تقرأ من نفس القناة لحظيًا.
// الطالب يختفي من "أونلاين" خلال ثوانٍ من إغلاق الصفحة أو انقطاع الإنترنت.
let ch = null, ready = false, state = {}
const subs = new Set(), emit = () => subs.forEach(f => f(state, ready))
export function stopPresence() { if (ch) sb.removeChannel(ch); ch = null; ready = false; state = {}; emit() }
export function startPresence(userId, meta = {}) {
  stopPresence()
  ch = sb.channel('academy-presence', { config: { presence: { key: userId } } })
  ch.on('presence', { event: 'sync' }, () => { state = ch.presenceState(); emit() })
    .subscribe(async st => { ready = st === 'SUBSCRIBED'; if (ready) await ch.track(meta); else { state = {}; } emit() })
}
export function watchPresence(fn) { subs.add(fn); fn(state, ready); return () => subs.delete(fn) }
