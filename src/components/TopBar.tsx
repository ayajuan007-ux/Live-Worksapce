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

export function TopBar() {
  const time = useColombiaClock()
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><Layers3 size={16} /></div>
        <span>JARVIS</span>
      </div>
      <div className="status-pill"><i className="live-dot" /> SISTEMA ONLINE</div>
      <div className="clock" aria-label="Hora Colombia"><small>COLOMBIA (COT)</small><strong>{time}</strong></div>
    </header>
  )
}
