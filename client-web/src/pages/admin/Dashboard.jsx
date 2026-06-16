import { useEffect, useState } from 'react'
import api from '../../services/api'
import PageHeader from '../../components/layout/PageHeader'
import { Spinner } from '../../components/ui/UI'
import styles from './Dashboard.module.css'
import { Bus, Users, GraduationCap, Radio, PhoneCall, MessageSquare } from 'lucide-react'

const STATS = [
  { key: 'totalBuses', label: 'Buses registered', icon: Bus, color: 'navy' },
  { key: 'activeTrips', label: 'Active trips now', icon: Radio, color: 'gold', pulse: true },
  { key: 'totalStudents', label: 'Students enrolled', icon: GraduationCap, color: 'navy' },
  { key: 'totalUsers', label: 'Users in system', icon: Users, color: 'navy' },
  { key: 'alertsToday', label: 'Voice alerts today', icon: PhoneCall, color: 'navy' },
  { key: 'smsToday', label: 'SMS sent today', icon: MessageSquare, color: 'navy' },
]

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In production this calls a real /api/dashboard/stats endpoint
    // Using mock data here for the portal shell
    const mock = {
      totalBuses: 12,
      activeTrips: 3,
      totalStudents: 148,
      totalUsers: 34,
      alertsToday: 89,
      smsToday: 7,
    }
    setTimeout(() => { setStats(mock); setLoading(false) }, 600)
  }, [])

  return (
    <div className={styles.page}>
      <PageHeader
        title="Dashboard"
        subtitle="Live overview of the AwaBus system"
      />

      <div className={styles.body}>
        {loading ? <Spinner /> : (
          <>
            <div className={styles.statsGrid}>
              {STATS.map(({ key, label, icon: Icon, color, pulse }) => (
                <div key={key} className={`${styles.statCard} ${color === 'gold' ? styles.statCardGold : ''}`}>
                  <div className={styles.statTop}>
                    <span className={styles.statLabel}>{label}</span>
                    <span className={`${styles.statIcon} ${pulse ? styles.statIconPulse : ''}`}>
                      <Icon size={15} strokeWidth={1.75} />
                    </span>
                  </div>
                  <div className={styles.statValue}>{stats[key]}</div>
                </div>
              ))}
            </div>

            <div className={styles.notice}>
              <span className={styles.noticeDot} />
              <p>
                Real-time trip tracking and live alerts are visible via the Activity Log.
                Bus drivers stream GPS coordinates every 10 seconds during active trips.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}