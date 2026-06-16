import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import PageHeader from '../../components/layout/PageHeader'
import {
  Button, Badge, Table, Th, Td, Tr, Modal,
  Input, Select, SearchInput, Empty, Spinner, StatusDot
} from '../../components/ui/UI'
import { UserPlus, MoreHorizontal } from 'lucide-react'
import styles from './AdminPage.module.css'

const ROLE_COLOR = { admin: 'blue', driver: 'amber', parent: 'green' }
const STATUS_COLOR = { active: 'green', suspended: 'red', deleted: 'gray' }

const EMPTY_FORM = {
  name: '', phone: '', role: 'parent',
  password: '', ivrPin: '', status: 'active'
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [actionMenu, setActionMenu] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/users')
      setUsers(data.users ?? data)
    } catch {
      toast.error('Could not load users.')
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

  function openEdit(u) {
    setEditTarget(u)
    setForm({
      name: u.name, phone: u.phone, role: u.role,
      password: '', ivrPin: '', status: u.status
    })
    setModalOpen(true)
    setActionMenu(null)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Name and phone are required.')
      return
    }
    setSaving(true)
    try {
      if (editTarget) {
        await api.put(`/users/${editTarget._id}`, form)
        toast.success('User updated.')
      } else {
        await api.post('/auth/register', form)
        toast.success('User created.')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusToggle(u) {
    const next = u.status === 'active' ? 'suspended' : 'active'
    try {
      await api.patch(`/users/${u._id}/status`, { status: next })
      toast.success(`User ${next}.`)
      load()
    } catch {
      toast.error('Could not update status.')
    }
    setActionMenu(null)
  }

  async function handleDelete(u) {
    if (!confirm(`Delete ${u.name}? This may be a soft delete if they have history.`)) return
    try {
      await api.delete(`/users/${u._id}`)
      toast.success('User deleted.')
      load()
    } catch {
      toast.error('Could not delete user.')
    }
    setActionMenu(null)
  }

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search)
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div className={styles.page} onClick={() => setActionMenu(null)}>
      <PageHeader
        title="Users"
        subtitle={`${users.length} users across all roles`}
        action={
          <Button variant="primary" size="md" onClick={openCreate}>
            <UserPlus size={14} />
            Add user
          </Button>
        }
      />

      <div className={styles.body}>
        <div className={styles.toolbar}>
          <SearchInput
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or phone…"
          />
          <div className={styles.filters}>
            {['all', 'admin', 'driver', 'parent'].map(r => (
              <button
                key={r}
                className={`${styles.filterBtn} ${roleFilter === r ? styles.filterBtnActive : ''}`}
                onClick={() => setRoleFilter(r)}
              >
                {r === 'all' ? 'All roles' : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? <Spinner /> : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th width="48px"></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5}><Empty message="No users match your search." /></td></tr>
              ) : filtered.map(u => (
                <Tr key={u._id}>
                  <Td>
                    <div className={styles.nameCell}>
                      <div className={styles.initials}>
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <span>{u.name}</span>
                    </div>
                  </Td>
                  <Td muted>{u.phone}</Td>
                  <Td>
                    <Badge color={ROLE_COLOR[u.role] ?? 'gray'}>{u.role}</Badge>
                  </Td>
                  <Td>
                    <span className={styles.statusCell}>
                      <StatusDot status={u.status} />
                      {u.status}
                    </span>
                  </Td>
                  <Td>
                    <div className={styles.menuWrap}>
                      <button
                        className={styles.menuBtn}
                        onClick={e => { e.stopPropagation(); setActionMenu(actionMenu === u._id ? null : u._id) }}
                        aria-label="Actions"
                      >
                        <MoreHorizontal size={15} />
                      </button>
                      {actionMenu === u._id && (
                        <div className={styles.dropdown} onClick={e => e.stopPropagation()}>
                          <button onClick={() => openEdit(u)}>Edit</button>
                          <button onClick={() => handleStatusToggle(u)}>
                            {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                          </button>
                          <button className={styles.dropdownDanger} onClick={() => handleDelete(u)}>Delete</button>
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
        title={editTarget ? 'Edit user' : 'Add user'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editTarget ? 'Save changes' : 'Create user'}
            </Button>
          </>
        }
      >
        <Input label="Full name" id="name" placeholder="e.g. Abena Mensah" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <Input label="Phone (E.164)" id="phone" placeholder="+233XXXXXXXXX" value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        <Select label="Role" id="role" value={form.role}
          onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
          <option value="parent">Parent</option>
          <option value="driver">Driver</option>
          <option value="admin">Admin</option>
        </Select>
        {!editTarget && (
          <>
            {(form.role === 'admin' || form.role === 'driver') && (
              <Input label="Password" id="password" type="password"
                placeholder="Min. 8 characters" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            )}
            {form.role === 'parent' && (
              <Input label="IVR PIN (4 digits)" id="ivrPin" type="password"
                placeholder="4-digit PIN for phone dial-in" value={form.ivrPin}
                onChange={e => setForm(f => ({ ...f, ivrPin: e.target.value }))} />
            )}
          </>
        )}
        {editTarget && (
          <Select label="Status" id="status" value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </Select>
        )}
      </Modal>
    </div>
  )
}