import { useEffect, useState } from 'react'
import { Layers3 } from 'lucide-react'

function useColombiaClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const day = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', weekday: 'short', day: '2-digit', month: 'short' })
    .format(now)
    .replace(/\./g, '')
    .toUpperCase()
  const hour = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now)
  return `${day} · ${hour}`
}

export function TopBar({ nodeCount }: { nodeCount: number }) {
  const time = useColombiaClock()
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><Layers3 size={16} /></div>
        <span>JARVIS</span>
      </div>
      <div className="topbar-title">
        <span className="eyebrow"><span className="live-dot" /> SPATIAL COMMAND · {nodeCount} NODOS</span>
        <h1>PROJECT FIELD</h1>
      </div>
      <div className="topbar-side">
        <div className="status-pill"><i className="live-dot" /> ONLINE</div>
        <div className="clock" aria-label="Hora Colombia"><small>COLOMBIA (COT)</small><strong>{time}</strong></div>
      </div>
    </header>
  )
}
