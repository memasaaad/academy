// ألوان المسارات + رسمة الكارت (SVG أصلي بالكامل — نوافذ كود ومخطط وشارة)
export const THEMES = { violet: ['#6a4fd1', '#a35bc9', 'بنفسجي'], teal: ['#0b5f9e', '#12a39a', 'أزرق مخضر'], blue: ['#1f6bff', '#0a2a8a', 'أزرق'], orange: ['#f39a2b', '#d9462f', 'برتقالي'], pink: ['#d6489a', '#8a3fd1', 'وردي'], green: ['#25b36b', '#0e6e5c', 'أخضر'] }
export const themeVars = t => { const [a, b] = THEMES[t] || THEMES.violet; return { '--ta': a, '--tb': b } }
export function TrackArt() {
  return <svg className="trk-art" viewBox="0 0 240 180" aria-hidden="true">
    <rect x="6" y="14" width="106" height="78" rx="9" fill="#10263f" fillOpacity=".78" stroke="#bfe9ff" strokeOpacity=".8" strokeWidth="2" />
    <circle cx="16" cy="24" r="2.4" fill="#fff" /><circle cx="24" cy="24" r="2.4" fill="#fff" fillOpacity=".7" /><circle cx="32" cy="24" r="2.4" fill="#fff" fillOpacity=".5" />
    <rect x="16" y="36" width="22" height="9" rx="2" fill="#fff" /><rect x="52" y="36" width="22" height="9" rx="2" fill="#fff" fillOpacity=".85" /><rect x="16" y="52" width="22" height="9" rx="2" fill="#fff" fillOpacity=".85" /><rect x="52" y="52" width="22" height="9" rx="2" fill="#fff" />
    <path d="M38 40.5h14M38 56.5h14M27 45v7" stroke="#fff" strokeWidth="1.6" fill="none" />
    <g stroke="#9fe2ff" strokeOpacity=".75" strokeWidth="2.2" strokeLinecap="round"><path d="M84 38h20M84 46h14M84 54h20M84 62h10M16 72h60"/></g>
    <rect x="40" y="70" width="140" height="96" rx="10" fill="#10263f" fillOpacity=".9" stroke="#bfe9ff" strokeOpacity=".9" strokeWidth="2.2" />
    <g strokeLinecap="round" strokeWidth="2.6"><path d="M54 90h34" stroke="#7ee0ff"/><path d="M94 90h40" stroke="#ffd36e"/><path d="M62 102h52" stroke="#c7b6ff"/><path d="M120 102h30" stroke="#fff" strokeOpacity=".7"/><path d="M62 114h28" stroke="#ffd36e"/><path d="M96 114h46" stroke="#7ee0ff"/><path d="M54 126h60" stroke="#fff" strokeOpacity=".7"/><path d="M120 126h26" stroke="#c7b6ff"/><path d="M54 138h40" stroke="#7ee0ff"/><path d="M100 138h30" stroke="#ffd36e"/><path d="M54 150h24" stroke="#fff" strokeOpacity=".7"/></g>
    <circle cx="196" cy="62" r="30" fill="#fff" fillOpacity=".95" /><circle cx="196" cy="62" r="30" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="6" />
    <text x="196" y="72" textAnchor="middle" fontSize="28" fontWeight="800" fill="var(--tb)" fontFamily="Cairo,monospace" direction="ltr">{'{ }'}</text>
    <path d="M214 118l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" fill="#fff" fillOpacity=".9" />
    <path d="M12 118l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" fill="#fff" fillOpacity=".6" />
  </svg>
}
