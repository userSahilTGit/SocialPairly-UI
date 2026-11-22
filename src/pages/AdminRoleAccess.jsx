import { useCallback, useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar'
import SiteFooter from '../components/SiteFooter'
import api from '../api/axios'
import { DASHBOARD_KEYS, EMPLOYEE_ROLE_LABELS } from '../utils/employeeAccess'
import './AdminRoleAccess.css'

const DASHBOARD_LABELS = {
  [DASHBOARD_KEYS.DASHBOARD]: 'Dashboard',
  [DASHBOARD_KEYS.QUESTIONS]: 'Questions',
  [DASHBOARD_KEYS.MODERATION]: 'Moderation Center',
  [DASHBOARD_KEYS.IDENTITY_DOCS]: 'Identity Docs',
  [DASHBOARD_KEYS.PLANS]: 'Plan & Subscriptions',
  [DASHBOARD_KEYS.EVENTS]: 'Events & Groups',
  [DASHBOARD_KEYS.FINANCE]: 'Finance',
  [DASHBOARD_KEYS.CUSTOMER_SUPPORT]: 'Customer Support',
  [DASHBOARD_KEYS.RATINGS]: 'Ratings',
  [DASHBOARD_KEYS.ROLE_ACCESS]: 'Role & Access',
}

const ROLE_OPTIONS = Object.keys(EMPLOYEE_ROLE_LABELS)

const SUPER_ADMIN_CONFIRM_MESSAGE =
  'Once Super Admin access is granted, it cannot be changed from this page. Any further change must be made directly in the database. Do you want to continue?'

function formatAssignedDate(dateValue) {
  if (!dateValue) return '—'
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return '—'
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

function buildAccessMap(rows) {
  const map = new Map()
  for (const row of rows || []) {
    map.set(`${row.roleCode}::${row.dashboardKey}`, row.canAccess === true)
  }
  return map
}

function confirmSuperAdminGrant() {
  return window.confirm(SUPER_ADMIN_CONFIRM_MESSAGE)
}

export default function AdminRoleAccess() {
  const [employees, setEmployees] = useState([])
  const [roles, setRoles] = useState(ROLE_OPTIONS)
  const [dashboards, setDashboards] = useState(Object.keys(DASHBOARD_LABELS))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const [assignEmail, setAssignEmail] = useState('')
  const [assignRole, setAssignRole] = useState('ADMIN')
  const [assignNotes, setAssignNotes] = useState('')

  const [savedAccess, setSavedAccess] = useState(() => new Map())
  const [draftAccess, setDraftAccess] = useState(() => new Map())

  const load = useCallback(async () => {
    setError('')
    try {
      const [catalogRes, employeesRes, dashboardsRes] = await Promise.all([
        api.get('/admin/access/catalog'),
        api.get('/admin/access/employees'),
        api.get('/admin/access/dashboards'),
      ])
      const catalogRoles = Array.isArray(catalogRes.data?.roles) ? catalogRes.data.roles : ROLE_OPTIONS
      const catalogDashboards = Array.isArray(catalogRes.data?.dashboards)
        ? catalogRes.data.dashboards
        : Object.keys(DASHBOARD_LABELS)
      const accessMap = buildAccessMap(dashboardsRes.data || [])
      setRoles(catalogRoles)
      setDashboards(catalogDashboards)
      setEmployees(employeesRes.data || [])
      setSavedAccess(accessMap)
      setDraftAccess(new Map(accessMap))
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load employee access data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const dirtyChanges = useMemo(() => {
    const changes = []
    const keys = new Set([...savedAccess.keys(), ...draftAccess.keys()])
    for (const key of keys) {
      const [roleCode, dashboardKey] = key.split('::')
      const saved = savedAccess.get(key) === true
      const draft = draftAccess.get(key) === true
      if (saved !== draft) {
        changes.push({ roleCode, dashboardKey, canAccess: draft })
      }
    }
    return changes
  }, [savedAccess, draftAccess])

  const matrixDirty = dirtyChanges.length > 0

  const showMessage = (text) => {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 3500)
  }

  const handleAssign = async (event) => {
    event.preventDefault()
    if (assignRole === 'SUPER_ADMIN' && !confirmSuperAdminGrant()) {
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.post('/admin/access/employees', {
        email: assignEmail.trim(),
        roleCode: assignRole,
        notes: assignNotes.trim() || null,
      })
      setAssignEmail('')
      setAssignNotes('')
      showMessage('Employee role assigned')
      await load()
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to assign role')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateEmployee = async (row, patch) => {
    const nextRole = patch.roleCode ?? row.roleCode
    if (nextRole === 'SUPER_ADMIN' && row.roleCode !== 'SUPER_ADMIN' && !confirmSuperAdminGrant()) {
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.put(`/admin/access/employees/${row.id}`, {
        roleCode: nextRole,
        active: patch.active ?? row.active,
        notes: row.notes ?? null,
      })
      showMessage('Employee assignment updated')
      await load()
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update assignment')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleDraft = (roleCode, dashboardKey, nextValue) => {
    setDraftAccess((prev) => {
      const next = new Map(prev)
      next.set(`${roleCode}::${dashboardKey}`, nextValue === true)
      return next
    })
  }

  const handleResetMatrix = () => {
    setDraftAccess(new Map(savedAccess))
  }

  const handleSaveMatrix = async () => {
    if (!matrixDirty) return
    setSaving(true)
    setError('')
    try {
      await Promise.all(
        dirtyChanges.map((change) =>
          api.put('/admin/access/dashboards', {
            roleCode: change.roleCode,
            dashboardKey: change.dashboardKey,
            canAccess: change.canAccess,
          }),
        ),
      )
      showMessage('Dashboard access updated')
      await load()
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update dashboard access')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="admin-access-page">
          <div className="admin-access-container">
            <p className="admin-access-loading">Loading role &amp; access…</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="admin-access-page">
        <div className="admin-access-container">
          <header className="admin-access-header">
            <div>
              <p className="breadcrumb-tag">Super Admin</p>
              <h1>Role &amp; Access</h1>
              <p>Manage privileged employees and which dashboards each role can open.</p>
            </div>
          </header>

          {error && <div className="admin-access-alert error" role="alert">{error}</div>}
          {message && <div className="admin-access-alert success" role="status">{message}</div>}

          <section className="admin-access-card">
            <h2>Assign employee role</h2>
            <p className="admin-access-hint">
              The email must already be registered. SUPER_ADMIN rows cannot be changed here (DB only).
            </p>
            <form className="admin-access-form" onSubmit={handleAssign}>
              <label>
                Registered email
                <input
                  type="email"
                  value={assignEmail}
                  onChange={(e) => setAssignEmail(e.target.value)}
                  required
                  placeholder="user@example.com"
                />
              </label>
              <label>
                Role
                <select value={assignRole} onChange={(e) => setAssignRole(e.target.value)}>
                  {roles.map((role) => (
                    <option key={role} value={role}>{EMPLOYEE_ROLE_LABELS[role] || role}</option>
                  ))}
                </select>
              </label>
              <label className="admin-access-notes">
                Notes (optional)
                <input
                  type="text"
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="Reason / team"
                />
              </label>
              <button type="submit" className="btn-access-primary" disabled={saving}>
                Assign role
              </button>
            </form>
          </section>

          <section className="admin-access-card">
            <h2>Privileged employees</h2>
            <div className="admin-access-table-wrap">
              <table className="admin-access-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Date Assigned</th>
                    <th>Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 && (
                    <tr>
                      <td colSpan={6}>No employee role assignments yet.</td>
                    </tr>
                  )}
                  {employees.map((row) => {
                    const locked = row.roleCode === 'SUPER_ADMIN'
                    return (
                      <tr key={row.id}>
                        <td className="admin-access-email" title={row.email}>{row.email}</td>
                        <td>{[row.firstName, row.lastName].filter(Boolean).join(' ') || '—'}</td>
                        <td>
                          {locked ? (
                            EMPLOYEE_ROLE_LABELS[row.roleCode] || row.roleCode
                          ) : (
                            <select
                              value={row.roleCode}
                              disabled={saving}
                              onChange={(e) => handleUpdateEmployee(row, { roleCode: e.target.value })}
                            >
                              {roles.map((role) => (
                                <option key={role} value={role}>{EMPLOYEE_ROLE_LABELS[role] || role}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td>{formatAssignedDate(row.updatedAt || row.createdAt)}</td>
                        <td>
                          <span className={`admin-access-pill ${row.active ? 'is-yes' : 'is-no'}`}>
                            {row.active ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td>
                          {locked ? (
                            <span className="admin-access-locked">DB only</span>
                          ) : (
                            <button
                              type="button"
                              className="btn-access-secondary"
                              disabled={saving}
                              onClick={() => handleUpdateEmployee(row, { active: !row.active })}
                            >
                              {row.active ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-access-card">
            <div className="admin-access-card-head">
              <div>
                <h2>Role → dashboard access</h2>
                <p className="admin-access-hint">
                  Toggle access locally, then press Update to save. ROLE_ACCESS stays Super-Admin only.
                  SUPER_ADMIN access cannot be revoked here.
                </p>
              </div>
              <div className="admin-access-matrix-actions">
                <button
                  type="button"
                  className="btn-access-secondary"
                  disabled={saving || !matrixDirty}
                  onClick={handleResetMatrix}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="btn-access-primary"
                  disabled={saving || !matrixDirty}
                  onClick={handleSaveMatrix}
                >
                  {saving ? 'Updating…' : 'Update'}
                </button>
              </div>
            </div>
            {matrixDirty && (
              <p className="admin-access-dirty">
                {dirtyChanges.length} unsaved change{dirtyChanges.length === 1 ? '' : 's'}
              </p>
            )}
            <div className="admin-access-table-wrap">
              <table className="admin-access-table matrix">
                <thead>
                  <tr>
                    <th>Role</th>
                    {dashboards.map((key) => (
                      <th key={key}>{DASHBOARD_LABELS[key] || key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roles.map((roleCode) => (
                    <tr key={roleCode}>
                      <td>{EMPLOYEE_ROLE_LABELS[roleCode] || roleCode}</td>
                      {dashboards.map((dashboardKey) => {
                        const mapKey = `${roleCode}::${dashboardKey}`
                        const checked = draftAccess.get(mapKey) === true
                        const supportOpsRole = ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_SUPPORT'].includes(roleCode)
                        const supportOpsDashboard =
                          dashboardKey === DASHBOARD_KEYS.CUSTOMER_SUPPORT
                          || dashboardKey === DASHBOARD_KEYS.RATINGS
                        const disableToggle =
                          roleCode === 'SUPER_ADMIN'
                          || (dashboardKey === DASHBOARD_KEYS.ROLE_ACCESS && roleCode !== 'SUPER_ADMIN' && !checked)
                          || (supportOpsDashboard && !supportOpsRole && !checked)
                        return (
                          <td key={`${roleCode}-${dashboardKey}`} className="matrix-cell">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={saving || disableToggle}
                              onChange={(e) => handleToggleDraft(roleCode, dashboardKey, e.target.checked)}
                              aria-label={`${roleCode} ${dashboardKey}`}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
      <SiteFooter />
    </>
  )
}
