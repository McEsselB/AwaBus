import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Users, Bus, GraduationCap,
  ActivitySquare, LogOut, Radio
} from 'lucide-react'
import styles from './AppShell.module.css'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/buses', label: 'Buses', icon: Bus },
  { to: '/students', label: 'Students', icon: GraduationCap },
  { to: '/logs', label: 'Activity Log', icon: ActivitySquare },
]

export default function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandDot} />
          <span className={styles.brandName}>AwaBus</span>
        </div>

        <div className={styles.liveIndicator}>
          <Radio size={12} />
          <span>System active</span>
        </div>

        <nav className={styles.nav}>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
            >
              <Icon size={16} strokeWidth={1.75} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userChip}>
            <div className={styles.avatar}>
              {user?.name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name ?? 'Admin'}</span>
              <span className={styles.userRole}>Administrator</span>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Sign out">
            <LogOut size={15} strokeWidth={1.75} />
          </button>
        </div>
      </aside>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}