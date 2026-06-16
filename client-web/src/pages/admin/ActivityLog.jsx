import { useState, useEffect, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import PageHeader from '../../components/layout/PageHeader'
import { Badge, Table, Th, Td, Tr, SearchInput, Select, Spinner, Empty } from '../../components/ui/UI'
import styles from './ActivityLog.module.css'

const TYPE_LABEL = {
  proximity_alert: 'Proximity alert',
  sms_fallback: 'SMS fallback',
  ivr_cancellation: 'IVR cancellation',
  ivr_bridge: 'IVR bridge',
  delay_broadcast: 'Delay broadcast',
}

const TYPE_COLOR = {
  proximity_alert: 'green',
  sms_fallback: 'amber',
  ivr_cancellation: 'blue',
  ivr_bridge: 'blue',
  delay_broadcast: 'amber',
}

const CHANNEL_COLOR = { voice: 'green', sms: 'amber', ivr: 'blue' }
const STATUS_COLOR = { sent: 'gray', delivered: 'green', failed: 'red' }

const PAGE_SIZE = 30

export default function ActivityLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [channelFilter, setChannelFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const socketRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page, limit: PAGE_SIZE,
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(channelFilter !== 'all' && { channel: channelFilter }),
        ...(search && { search }),
      })
      const { data } = await api.get(`/logs?${params}`)
      setLogs(data.logs ?? data)
      setTotal(data.total ?? data.length)
    } catch {
      toast.error('Could not load activity log.')
    } finally {
      setLoading(false)
    }
  }, [page, typeFilter, statusFilter, channelFilter, search])

  useEffect(() => { load() }, [load])

  // Socket.io for live log entries
  useEffect(() => {
    const token = localStorage.getItem('awa_token')
    const socket = io('/', { auth: { token }, transports: ['websocket'] })
    socketRef.current = socket

    socket.on('log:new', (entry) => {
      setLogs(prev => [entry, ...prev])
      toast.success(`New event: ${TYPE_LABEL[entry.type] ?? entry.type}`, { duration: 2500 })
    })

    socket.on('alert:critical', (msg) => {
      toast.error(`Critical: ${msg}`, { duration: 6000 })
    })

    return () => socket.disconnect()
  }, [])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className={styles.page}>
      <PageHeader
        title="Activity Log"
        subtitle="Every voice call, SMS, and IVR event — append-only."
      />

      <div className={styles.body}>
        <div className={styles.toolbar}>
          <SearchInput value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search student or phone…" />

          <Select id="typeF" value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
            style={{ width: 'auto', height: '36px', fontSize: '13px' }}>
            <option value="all">All types</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>

          <Select id="chanF" value={channelFilter}
            onChange={e => { setChannelFilter(e.target.value); setPage(1) }}
            style={{ width: 'auto', height: '36px', fontSize: '13px' }}>
            <option value="all">All channels</option>
            <option value="voice">Voice</option>
            <option value="sms">SMS</option>
            <option value="ivr">IVR</option>
          </Select>

          <Select id="statF" value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            style={{ width: 'auto', height: '36px', fontSize: '13px' }}>
            <option value="all">All statuses</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
          </Select>
        </div>

        <div className={styles.liveBar}>
          <span className={styles.liveDot} />
          <span>Live — new events appear automatically</span>
          <span className={styles.liveCount}>{total} total entries</span>
        </div>

        {loading ? <Spinner /> : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Time</Th>
                  <Th>Type</Th>
                  <Th>Channel</Th>
                  <Th>Recipient</Th>
                  <Th>Status</Th>
                  <Th>Details</Th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={6}><Empty message="No log entries match your filters." /></td></tr>
                ) : logs.map((log, i) => (
                  <Tr key={log._id ?? i}>
                    <Td muted>
                      <span className={styles.timestamp}>
                        {log.timestamp ? format(new Date(log.timestamp), 'dd MMM, HH:mm:ss') : '—'}
                      </span>
                    </Td>
                    <Td>
                      <Badge color={TYPE_COLOR[log.type] ?? 'gray'}>
                        {TYPE_LABEL[log.type] ?? log.type}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge color={CHANNEL_COLOR[log.channel] ?? 'gray'}>
                        {log.channel}
                      </Badge>
                    </Td>
                    <Td muted>{log.recipientPhone ?? '—'}</Td>
                    <Td>
                      <Badge color={STATUS_COLOR[log.status] ?? 'gray'}>
                        {log.status}
                      </Badge>
                    </Td>
                    <Td muted>
                      {log.failureReason
                        ? <span className={styles.failure}>{log.failureReason}</span>
                        : log.arkeselCallId ?? log.arkeselSessionId ?? '—'
                      }
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </button>
                <span className={styles.pageInfo}>
                  Page {page} of {totalPages}
                </span>
                <button
                  className={styles.pageBtn}
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}