export function LineChart({ data, h = 160 }) { // data: [{l, v}] قيم 0-100
  if (!data.length) return <p className="muted">لا توجد بيانات بعد</p>
  const w = 400, pad = 24, step = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0
  const pts = data.map((d, i) => [pad + i * step, h - pad - (d.v / 100) * (h - pad * 2)])
  return <svg viewBox={`0 0 ${w} ${h}`} className="chart">{[0, 50, 100].map(g => <g key={g}><line x1={pad} x2={w - pad} y1={h - pad - g / 100 * (h - pad * 2)} y2={h - pad - g / 100 * (h - pad * 2)} stroke="#e2e8f0" /><text x="2" y={h - pad - g / 100 * (h - pad * 2) + 4} fontSize="10" fill="#94a3b8">{g}</text></g>)}
    <polyline fill="none" stroke="#2563eb" strokeWidth="3" points={pts.map(p => p.join(',')).join(' ')} />{pts.map((p, i) => <g key={i}><circle cx={p[0]} cy={p[1]} r="4" fill="#2563eb" /><text x={p[0]} y={h - 6} fontSize="9" textAnchor="middle" fill="#64748b">{data[i].l.slice(0, 8)}</text></g>)}</svg>
}
export function Bars({ data, h = 160 }) { // [{l, v}]
  const mx = Math.max(1, ...data.map(d => d.v)), w = 400, bw = (w - 20) / data.length
  return <svg viewBox={`0 0 ${w} ${h}`} className="chart">{data.map((d, i) => { const bh = (d.v / mx) * (h - 40); return <g key={i}><rect x={10 + i * bw + 8} y={h - 22 - bh} width={bw - 16} height={bh} rx="6" fill="#3b82f6" /><text x={10 + i * bw + bw / 2} y={h - 26 - bh} fontSize="11" textAnchor="middle" fill="#334155">{d.v}</text><text x={10 + i * bw + bw / 2} y={h - 6} fontSize="10" textAnchor="middle" fill="#64748b">{d.l}</text></g> })}</svg>
}
export function Donut({ data }) { // [{l, v, c}]
  const tot = data.reduce((a, b) => a + b.v, 0) || 1; let acc = 0, r = 40, C = 2 * Math.PI * r
  return <div className="donut"><svg viewBox="0 0 100 100" width="150"><circle cx="50" cy="50" r={r} fill="none" stroke="#eef2f7" strokeWidth="14" />
    {data.map((d, i) => { const len = d.v / tot * C, el = <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={d.c} strokeWidth="14" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} transform="rotate(-90 50 50)" />; acc += len; return el })}
    <text x="50" y="54" textAnchor="middle" fontSize="14" fontWeight="800" fill="#0f172a">{tot}</text></svg>
    <ul>{data.map(d => <li key={d.l}><i style={{ background: d.c }} />{d.l} <b>{d.v}</b></li>)}</ul></div>
}
export function AreaChart({ data, h = 200 }) { // [{l, v}] 0-100، منحنى ناعم مع تعبئة
  if (!data.length) return null
  const w = 560, px = 36, py = 22, step = data.length > 1 ? (w - px * 2) / (data.length - 1) : 0
  const P = data.map((d, i) => [px + i * step, h - py - (d.v / 100) * (h - py * 2)])
  const path = P.map((p, i) => { if (!i) return `M${p[0]},${p[1]}`; const q = P[i - 1], c = (p[0] - q[0]) / 2; return `C${q[0] + c},${q[1]} ${p[0] - c},${p[1]} ${p[0]},${p[1]}` }).join(' ')
  const last = P[P.length - 1]
  return <svg viewBox={`0 0 ${w} ${h}`} className="chart" role="img" aria-label="رسم بياني لمتوسط الدرجات"><defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1f63ee" stopOpacity=".22" /><stop offset="1" stopColor="#1f63ee" stopOpacity="0" /></linearGradient></defs>
    {[0, 50, 100].map(g => { const y = h - py - g / 100 * (h - py * 2); return <g key={g}><line x1={px} x2={w - 8} y1={y} y2={y} stroke="#e4eaf4" strokeDasharray="3 4" /><text x={px - 8} y={y + 4} fontSize="11" textAnchor="end" fill="#94a3b8">{g}</text></g> })}
    <path d={`${path} L${last[0]},${h - py} L${P[0][0]},${h - py} Z`} fill="url(#ag)" /><path d={path} fill="none" stroke="#1f63ee" strokeWidth="3" strokeLinecap="round" />
    {P.map((p, i) => <g key={i}><circle cx={p[0]} cy={p[1]} r="4" fill="#fff" stroke="#1f63ee" strokeWidth="2.5" />{(data.length <= 8 || i % Math.ceil(data.length / 8) === 0) && <text x={p[0]} y={h - 4} fontSize="10.5" textAnchor="middle" fill="#64748b">{data[i].l}</text>}</g>)}
    <g transform={`translate(${last[0]},${last[1] - 26})`}><rect x="-22" y="-12" width="44" height="22" rx="6" fill="#1f63ee" /><text y="3" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">{data[data.length - 1].v}%</text></g></svg>
}
