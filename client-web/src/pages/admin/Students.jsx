import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import PageHeader from '../../components/layout/PageHeader'
import {
  Button, Table, Th, Td, Tr, Modal,
  Input, Select, SearchInput, Empty, Spinner
} from '../../components/ui/UI'
import { Plus, Map, List, MoreHorizontal } from 'lucide-react'
import styles from './Students.module.css'
import adminStyles from './AdminPage.module.css'
import MapWorkspace from '../../components/map/MapWorkspace'

const EMPTY_FORM = {
  name: '', parentUserId: '', driverUserId: '',
  homeLatitude: '', homeLongitude: '', geofenceRadius: 500
}

export default function Students() {
  const [students, setStudents] = useState([])
  const [parents, setParents] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [view, setView] = useState('list')
  const [driverFilter, setDriverFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [actionMenu, setActionMenu] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [stuRes, parRes, drvRes] = await Promise.all([
        api.get('/students'),
        api.get('/users?role=parent'),
        api.get('/users?role=driver'),
      ])
      setStudents(stuRes.data.students ?? stuRes.data)
      setParents(parRes.data.users ?? parRes.data)
      setDrivers(drvRes.data.users ?? drvRes.data)
    } catch {
      toast.error('Could not load students.')
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

  function openEdit(s) {
    setEditTarget(s)
    setForm({
      name: s.name,
      parentUserId: s.parentUserId?._id ?? s.parentUserId ?? '',
      driverUserId: s.driverUserId?._id ?? s.driverUserId ?? '',
      homeLatitude: s.homeLatitude ?? '',
      homeLongitude: s.homeLongitude ?? '',
      geofenceRadius: s.geofenceRadius ?? 500,
    })
    setModalOpen(true)
    setActionMenu(null)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.homeLatitude || !form.homeLongitude) {
      toast.error('Name and home coordinates are required.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        homeLatitude: parseFloat(form.homeLatitude),
        homeLongitude: parseFloat(form.homeLongitude),
        geofenceRadius: parseInt(form.geofenceRadius),
      }
      if (editTarget) {
        await api.put(`/students/${editTarget._id}`, payload)
        toast.success('Student updated.')
      } else {
        await api.post('/students', payload)
        toast.success('Student created.')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(s) {
    if (!confirm(`Remove ${s.name} from the system?`)) return
    try {
      await api.delete(`/students/${s._id}`)
      toast.success('Student removed.')
      load()
    } catch {
      toast.error('Could not remove student.')
    }
    setActionMenu(null)
  }

  function handleMapPin(lat, lng) {
    setForm(f => ({ ...f, homeLatitude: lat.toFixed(6), homeLongitude: lng.toFixed(6) }))
  }

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase())
    const matchDriver = driverFilter === 'all' ||
      (s.driverUserId?._id ?? s.driverUserId) === driverFilter
    return matchSearch && matchDriver
  })

  const userName = (id, list) => list.find(u => u._id === id)?.name ?? '—'

  return (
    <div className={styles.page} onClick={() => setActionMenu(null)}>
      <PageHeader
        title="Students"
        subtitle={`${students.length} students enrolled`}
        action={
          <Button variant="primary" size="md" onClick={openCreate}>
            <Plus size={14} />
            Add student
          </Button>
        }
      />

      <div className={styles.body}>
        <div className={adminStyles.toolbar}>
          <SearchInput value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name…" />

          <Select id="driverFilter" value={driverFilter}
            onChange={e => setDriverFilter(e.target.value)}
            style={{ width: 'auto', height: '36px', fontSize: '13px' }}>
            <option value="all">All drivers</option>
            {drivers.map(d => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </Select>

          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${view === 'list' ? styles.viewBtnActive : ''}`}
              onClick={() => setView('list')}
            >
              <List size={14} />
            </button>
            <button
              className={`${styles.viewBtn} ${view === 'map' ? styles.viewBtnActive : ''}`}
              onClick={() => setView('map')}
            >
              <Map size={14} />
            </button>
          </div>
        </div>

        {loading ? <Spinner /> : view === 'map' ? (
          <MapWorkspace
            students={filtered}
            drivers={drivers}
            driverFilter={driverFilter}
            onStudentClick={openEdit}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Parent</Th>
                <Th>Driver</Th>
                <Th>Coordinates</Th>
                <Th>Radius</Th>
                <Th width="48px"></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6}><Empty message="No students match your search." /></td></tr>
              ) : filtered.map(s => (
                <Tr key={s._id}>
                  <Td>
                    <div className={adminStyles.nameCell}>
                      <div className={adminStyles.initials}>{s.name?.[0]?.toUpperCase()}</div>
                      <span>{s.name}</span>
                    </div>
                  </Td>
                  <Td muted>{userName(s.parentUserId?._id ?? s.parentUserId, parents)}</Td>
                  <Td muted>{userName(s.driverUserId?._id ?? s.driverUserId, drivers)}</Td>
                  <Td muted>
                    <span className={styles.coords}>
                      {s.homeLatitude?.toFixed(4)}, {s.homeLongitude?.toFixed(4)}
                    </span>
                  </Td>
                  <Td muted>{s.geofenceRadius}m</Td>
                  <Td>
                    <div className={adminStyles.menuWrap}>
                      <button className={adminStyles.menuBtn}
                        onClick={e => { e.stopPropagation(); setActionMenu(actionMenu === s._id ? null : s._id) }}>
                        <MoreHorizontal size={15} />
                      </button>
                      {actionMenu === s._id && (
                        <div className={adminStyles.dropdown} onClick={e => e.stopPropagation()}>
                          <button onClick={() => openEdit(s)}>Edit</button>
                          <button className={adminStyles.dropdownDanger} onClick={() => handleDelete(s)}>Remove</button>
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
        title={editTarget ? 'Edit student' : 'Add student'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editTarget ? 'Save changes' : 'Create student'}
            </Button>
          </>
        }
      >
        <Input label="Student name" id="sname" placeholder="e.g. Kofi Mensah"
          value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <Select label="Parent" id="parent" value={form.parentUserId}
          onChange={e => setForm(f => ({ ...f, parentUserId: e.target.value }))}>
          <option value="">— Select parent —</option>
          {parents.map(p => <option key={p._id} value={p._id}>{p.name} · {p.phone}</option>)}
        </Select>
        <Select label="Driver (route)" id="driver" value={form.driverUserId}
          onChange={e => setForm(f => ({ ...f, driverUserId: e.target.value }))}>
          <option value="">— Select driver —</option>
          {drivers.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
        </Select>

        <div className={styles.coordNote}>
          Drop a pin on the map below, or enter coordinates manually.
        </div>

        <div className={styles.miniMapWrap}>
          <MapWorkspace
            mini
            students={editTarget ? [{ ...editTarget, homeLatitude: parseFloat(form.homeLatitude) || editTarget.homeLatitude, homeLongitude: parseFloat(form.homeLongitude) || editTarget.homeLongitude, geofenceRadius: parseInt(form.geofenceRadius) }] : []}
            drivers={drivers}
            onMapClick={handleMapPin}
          />
        </div>

        <div className={adminStyles.formGrid}>
          <Input label="Latitude" id="lat" type="number" step="any" placeholder="e.g. 5.6037"
            value={form.homeLatitude}
            onChange={e => setForm(f => ({ ...f, homeLatitude: e.target.value }))} />
          <Input label="Longitude" id="lng" type="number" step="any" placeholder="e.g. -0.1870"
            value={form.homeLongitude}
            onChange={e => setForm(f => ({ ...f, homeLongitude: e.target.value }))} />
          <div className={adminStyles.formGridFull}>
            <Input label={`Geofence radius: ${form.geofenceRadius}m`} id="radius" type="range"
              min="100" max="2000" step="50"
              value={form.geofenceRadius}
              onChange={e => setForm(f => ({ ...f, geofenceRadius: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  )
}