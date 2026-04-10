import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Newspaper, TrendingUp, Brain, FlaskConical, Zap, X } from 'lucide-react'
import { useAppStore } from '../store/appStore.js'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/news', icon: Newspaper, label: 'News & Analyse' },
  { to: '/stocks', icon: TrendingUp, label: 'Aktienkurse' },
  { to: '/recommendations', icon: Brain, label: 'KI-Empfehlungen' },
  { to: '/simulator', icon: FlaskConical, label: 'Simulator' },
]

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useAppStore()

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed lg:relative z-30 h-full flex flex-col bg-bg-secondary border-r border-border',
        'transition-all duration-300 ease-in-out',
        sidebarOpen ? 'w-56 translate-x-0' : 'w-0 lg:w-16 -translate-x-full lg:translate-x-0 overflow-hidden'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border min-h-[65px]">
          <div className="w-8 h-8 bg-accent-blue rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <span className="font-bold text-white text-lg leading-none">Velocity</span>
              <p className="text-xs text-gray-500 mt-0.5">AI Stock Intelligence</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  sidebarOpen ? '' : 'justify-center',
                  isActive
                    ? 'bg-accent-blue text-white'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-bg-elevated'
                )
              }
              title={!sidebarOpen ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer info */}
        {sidebarOpen && (
          <div className="p-4 border-t border-border">
            <div className="bg-bg-elevated rounded-lg p-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                Demo-Modus aktiv. Konfiguriere API-Keys in den Einstellungen für Live-Daten.
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
