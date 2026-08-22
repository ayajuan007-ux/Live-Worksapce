import { useState } from 'react'
import { Home, LayoutGrid, Calendar, Target, CheckCircle, BarChart3, FileText, MessageCircle, User, LogOut, Sparkles } from 'lucide-react'

type IconType = React.ComponentType<{ size?: number; className?: string }>
type NavItem = { id: string; label: string; icon: IconType; spark?: boolean }

const navItems: NavItem[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'pipeline', label: 'Pipeline', icon: LayoutGrid },
  { id: 'seguimientos', label: 'Seguimientos', icon: Calendar },
  { id: 'configurar-icp', label: 'Configurar ICP', icon: Target, spark: true },
  { id: 'ranking-icp', label: 'Ranking ICP', icon: CheckCircle, spark: true },
  { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3, spark: true },
  { id: 'planes', label: 'Planes', icon: FileText },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'perfil', label: 'Perfil', icon: User },
]

export default function Sidebar({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <aside
      className={`nav-sidebar ${expanded ? 'nav-expanded' : ''}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="nav-header">SO</div>
      <nav className="nav-items">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? 'nav-active' : ''}`}
            onClick={() => onSelect(item.id)}
          >
            <item.icon size={18} className="nav-icon" />
            <span className="nav-label">{item.label}</span>
            {item.spark && <Sparkles size={11} className="nav-spark" />}
          </button>
        ))}
      </nav>
      <div className="nav-footer">
        <div className="nav-links">
          <span>ACERCA DE</span><span>CONTACTO</span><span>TÉRMINOS</span><span>POLÍTICAS</span>
        </div>
        <button className="nav-item nav-logout">
          <LogOut size={18} className="nav-icon" />
          <span className="nav-label">CERRAR SESIÓN</span>
        </button>
      </div>
    </aside>
  )
}
