import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import PageHeader from '../../components/layout/PageHeader'
import {
  Button, Badge, Table, Th, Td, Tr, Modal,
  Input, Select, SearchInput, Empty, Spinner, StatusDot
} from '../../components/ui/UI'
import { Plus, MoreHorizontal } from 'lucide-react'
import styles from './AdminPage.module.css'

const STATUS_COLOR = { Idle: 'gray', 'Active Trip': 'green', Maintenance: 'amber' }

const EMPTY_FORM = { registrationNumber: '', nickname: '', capacity: '', status: 'Idle', assignedDriverUserId: '' }

export default function Buses() {
  const [buses, setBuses] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [actionMenu, setActionMenu] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [busRes, driverRes] = await Promise.all([
        api.get('/buses'),
        api.get('/users?role=driver'),
      ])
      setBuses(busRes.data.buses ?? busRes.data)
      setDrivers(driverRes.data.users ?? driverRes.data)
    } catch {
      toast.error('Could not load buses.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(b) {
    setEditTarget(b)
    setForm({
      registrationNumber: b.registrationNumber,
      nickname: b.nickname ?? '',
      capacity: b.capacity ?? '',
      status: b.status,
      assignedDriverUserId: b.assignedDriverUserId?._id ?? b.assignedDriverUserId ?? '',
    })
    setModalOpen(true)
    setActionMenu(null)
  }

  async function handleSave() {
    if (!form.registrationNumber.trim()) {
      toast.error('Registration number is required.')
      return
    }
    setSaving(true)
    try {
      if (editTarget) {
        await api.put(`/buses/${editTarget._id}`, form)
        // Handle driver assignment separately
        await api.patch(`/buses/${editTarget._id}/assign-driver`, {
          driverUserId: form.assignedDriverUserId || null
        })
        toast.success('Bus updated.')
      } else {
        const { data } = await api.post('/buses', form)
        if (form.assignedDriverUserId) {
          await api.patch(`/buses/${data._id}/assign-driver`, {
            driverUserId: form.assignedDriverUserId
          })
        }
        toast.success('Bus created.')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(b) {
    if (!confirm(`Delete bus ${b.registrationNumber}?`)) return
    try {
      await api.delete(`/buses/${b._id}`)
      toast.success('Bus deleted.')
      load()
    } catch {
      toast.error('Cannot delete — bus may have an assigned driver or trip history.')
    }
    setActionMenu(null)
  }

  const filtered = buses.filter(b =>
    b.registrationNumber.toLowerCase().includes(search.toLowerCase()) ||
    (b.nickname ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const driverName = (b) => {
    const id = b.assignedDriverUserId?._id ?? b.assignedDriverUserId
    const d = drivers.find(d => d._id === id)
    return d?.name ?? '—'
  }

  return (
    <div className={styles.page} onClick={() => setActionMenu(null)}>
      <PageHeader
        title="Buses"
        subtitle={`${buses.length} buses registered`}
        action={
          <Button variant="primary" size="md" onClick={openCreate}>
            <Plus size={14} />
            Add bus
          </Button>
        }
      />

      <div className={styles.body}>
        <div className={styles.toolbar}>
          <SearchInput value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by plate or nickname…" />
        </div>

        {loading ? <Spinner /> : (
          <Table>
            <thead>
              <tr>
                <Th>Registration</Th>
                <Th>Nickname</Th>
                <Th>Capacity</Th>
                <Th>Assigned driver</Th>
                <Th>Status</Th>
                <Th width="48px"></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6}><Empty message="No buses match your search." /></td></tr>
              ) : filtered.map(b => (
                <Tr key={b._id}>
                  <Td><span className={styles.busReg}>{b.registrationNumber}</span></Td>
                  <Td muted>{b.nickname || '—'}</Td>
                  <Td muted>{b.capacity ? `${b.capacity} seats` : '—'}</Td>
                  <Td>{driverName(b)}</Td>
                  <Td>
                    <span className={styles.statusCell}>
                      <StatusDot status={b.status} />
                      {b.status}
                    </span>
                  </Td>
                  <Td>
                    <div className={styles.menuWrap}>
                      <button className={styles.menuBtn}
                        onClick={e => { e.stopPropagation(); setActionMenu(actionMenu === b._id ? null : b._id) }}>
                        <MoreHorizontal size={15} />
                      </button>
                      {actionMenu === b._id && (
                        <div className={styles.dropdown} onClick={e => e.stopPropagation()}>
                          <button onClick={() => openEdit(b)}>Edit</button>
                          <button className={styles.dropdownDanger} onClick={() => handleDelete(b)}>Delete</button>
                        </div>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Edit bus' : 'Add bus'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editTarget ? 'Save changes' : 'Create bus'}
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <div className={styles.formGridFull}>
            <Input label="Registration number" id="reg" placeholder="e.g. GR-1234-22"
              value={form.registrationNumber}
              onChange={e => setForm(f => ({ ...f, registrationNumber: e.target.value }))} />
          </div>
          <Input label="Nickname (optional)" id="nickname" placeholder="e.g. Yellow Bus"
            value={form.nickname}
            onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} />
          <Input label="Capacity" id="capacity" type="number" placeholder="e.g. 30"
            value={form.capacity}
            onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
          <div className={styles.formGridFull}>
            <Select label="Assign driver" id="driver" value={form.assignedDriverUserId}
              onChange={e => setForm(f => ({ ...f, assignedDriverUserId: e.target.value }))}>
              <option value="">— No driver assigned —</option>
              {drivers.map(d => (
                <option key={d._id} value={d._id}>{d.name} · {d.phone}</option>
              ))}
            </Select>
          </div>
          <div className={styles.formGridFull}>
            <Select label="Status" id="status" value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="Idle">Idle</option>
              <option value="Maintenance">Maintenance</option>
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  )
}