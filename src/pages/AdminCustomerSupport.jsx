import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import Navbar from '../components/Navbar'
import SiteFooter from '../components/SiteFooter'
import api from '../api/axios'
import {
  DAYS_OF_WEEK,
  TWO_HOUR_SLOTS,
  filterCallbacksBySchedule,
  formatCallbackSchedule,
} from '../utils/callbackSlots'
import { notifySupportInboxChanged } from '../utils/supportInbox'
import './AdminCustomerSupport.css'

const FILTERS = ['PENDING', 'CONTACTED', 'CLOSED', 'ALL']

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  CUSTOMER_SUPPORT: 'Customer Support',
}

const STATUS_VERBS = {
  CONTACTED: 'Marked contacted',
  CLOSED: 'Closed',
  PENDING: 'Reopened',
}

function formatWhen(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

function roleLabel(code) {
  if (!code) return 'Staff'
  return ROLE_LABELS[code] || code.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function StaffStamp({ name, userId, email, role, at, status }) {
  if (!name && !userId) return <span className="cs-muted">—</span>
  return (
    <div className="cs-stamp">
      <span className="cs-stamp-verb">{STATUS_VERBS[status] || 'Updated'} by</span>
      <strong>{name || email}</strong>
      <span className="cs-stamp-meta">
        ID #{userId ?? '—'} · {roleLabel(role)}
      </span>
      {email && name && <span className="cs-stamp-meta">{email}</span>}
      <span className="cs-stamp-meta">{formatWhen(at)}</span>
    </div>
  )
}

export default function AdminCustomerSupport() {
  const [callbacks, setCallbacks] = useState([])
  const [notifications, setNotifications] = useState([])
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [dayFilter, setDayFilter] = useState('ALL')
  const [slotFilter, setSlotFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [highlightId, setHighlightId] = useState(null)
  const [spin, setSpin] = useState(false)
  const [toasts, setToasts] = useState([])
  const queueRef = useRef(null)

  const showToast = useCallback((message, tone = 'violet') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, message, tone }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2600)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = statusFilter !== 'ALL' ? { status: statusFilter } : undefined
      const [callbackRes, notificationRes] = await Promise.all([
        api.get('/admin/customer-support/callbacks', { params }),
        api.get('/admin/customer-support/notifications'),
      ])
      setCallbacks(callbackRes.data || [])
      setNotifications(notificationRes.data || [])
    } catch {
      setError('Failed to load customer support callbacks.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const timer = setInterval(load, 30000)
    return () => clearInterval(timer)
  }, [load])

  const activeNotifications = useMemo(
    () => notifications.filter((item) => !item.read),
    [notifications],
  )

  const unreadCount = activeNotifications.length

  const filteredCallbacks = useMemo(
    () => filterCallbacksBySchedule(callbacks, dayFilter, slotFilter),
    [callbacks, dayFilter, slotFilter],
  )

  const handleRefresh = async () => {
    setSpin(true)
    await load()
    notifySupportInboxChanged()
    setTimeout(() => setSpin(false), 550)
    showToast('Support console synced')
  }

  const updateStatus = async (row, status) => {
    setUpdatingId(row.id)
    try {
      await api.patch(`/admin/customer-support/callbacks/${row.id}`, { status })
      showToast(`${row.userName} marked as ${status}`, status === 'PENDING' ? 'violet' : 'emerald')
      await load()
      notifySupportInboxChanged()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update callback status.')
    } finally {
      setUpdatingId(null)
    }
  }

  const jumpToCallback = (notification) => {
    if (!notification.relatedCallbackId) return
    setDayFilter('ALL')
    setSlotFilter('ALL')
    setStatusFilter(notification.callbackStatus && notification.callbackStatus !== 'PENDING' ? 'ALL' : 'PENDING')
    setHighlightId(notification.relatedCallbackId)
    queueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => setHighlightId(null), 2400)
  }

  return (
    <>
      <Navbar />
      <div className="cs-console">
        <main className="cs-main">
          <div className="cs-page-head">
            <div>
              <p className="cs-eyebrow">Employee Console</p>
              <h1>Customer Support</h1>
              <p className="cs-subtitle">
                24/7 scheduled callback slots and staff notifications for Super Admin, Admin, and Customer Support.
              </p>
            </div>
            <button type="button" className="cs-btn-refresh" onClick={handleRefresh} disabled={loading && spin}>
              <RefreshCw size={14} className={spin ? 'cs-spin-once' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {error && <div className="cs-alert" role="alert">{error}</div>}

          <section className="cs-card" aria-labelledby="cs-notifications-heading">
            <div className="cs-card-head">
              <h2 id="cs-notifications-heading">Notifications</h2>
              <span className="cs-unread-pill">{unreadCount} unread</span>
            </div>
            <p className="cs-card-hint">
              Unread alerts only. Mark a callback <strong>contacted</strong> or <strong>closed</strong> below
              to clear it here — the record stays in the database and the callback queue for future reference.
            </p>

            {loading && notifications.length === 0 ? (
              <p className="cs-empty">Loading notifications…</p>
            ) : activeNotifications.length === 0 ? (
              <p className="cs-empty">No unread callback notifications.</p>
            ) : (
              <ul className="cs-notification-list">
                {activeNotifications.slice(0, 20).map((item) => {
                  const notifSchedule = formatCallbackSchedule(item)
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="cs-notification is-unread"
                        onClick={() => jumpToCallback(item)}
                        title="Show in callback queue"
                      >
                        <div className="cs-notification-body">
                          <div className="cs-notification-title">
                            <span className="cs-dot" aria-hidden="true" />
                            <h3>{item.title}</h3>
                          </div>
                          <p>{item.message}</p>
                          {notifSchedule.hasSchedule && (
                            <span className="cs-slot-chip">
                              {notifSchedule.dayLine} · {notifSchedule.slotLine}
                            </span>
                          )}
                          <span className="cs-time">{formatWhen(item.createdAt)}</span>
                        </div>
                        <span className="cs-notification-state is-pending">
                          Awaiting action
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="cs-card" aria-labelledby="cs-queue-heading" ref={queueRef}>
            <div className="cs-card-head cs-card-head--queue">
              <h2 id="cs-queue-heading">Callback queue</h2>
              <div className="cs-queue-controls">
                <div role="tablist" aria-label="Callback queue filter" className="cs-filters">
                  {FILTERS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={statusFilter === value}
                      className={`cs-filter${statusFilter === value ? ' is-active' : ''}`}
                      onClick={() => setStatusFilter(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <div className="cs-schedule-filters">
                  <select
                    aria-label="Filter by callback day"
                    className="cs-select"
                    value={dayFilter}
                    onChange={(e) => setDayFilter(e.target.value)}
                  >
                    <option value="ALL">All Days</option>
                    {DAYS_OF_WEEK.map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Filter by 2-hour slot"
                    className="cs-select"
                    value={slotFilter}
                    onChange={(e) => setSlotFilter(e.target.value)}
                  >
                    <option value="ALL">All 2-Hour Slots (24/7)</option>
                    {TWO_HOUR_SLOTS.map((slot) => (
                      <option key={slot.code} value={slot.code}>{slot.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="cs-table-wrap">
              <table className="cs-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Phone</th>
                    <th>Scheduled Slot (24/7)</th>
                    <th>Note</th>
                    <th>Requested</th>
                    <th>Status</th>
                    <th>Updated by</th>
                    <th className="cs-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && callbacks.length === 0 ? (
                    <tr><td colSpan={8} className="cs-empty-row">Loading callbacks…</td></tr>
                  ) : filteredCallbacks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="cs-empty-row">
                        No callback requests matching <strong>{statusFilter}</strong>
                        {dayFilter !== 'ALL' ? ` · ${dayFilter}` : ''}
                        {slotFilter !== 'ALL' ? ` · ${slotFilter}` : ''}.
                      </td>
                    </tr>
                  ) : (
                    filteredCallbacks.map((row) => {
                      const schedule = formatCallbackSchedule(row)
                      return (
                        <tr key={row.id} className={highlightId === row.id ? 'is-highlighted' : undefined}>
                          <td>
                            <div className="cs-member">{row.userName}</div>
                            <div className="cs-muted">{row.userEmail}</div>
                          </td>
                          <td className="cs-nowrap">
                            <a href={`tel:${row.phoneNumber}`}>{row.phoneNumber}</a>
                          </td>
                          <td>
                            <div className="cs-slot-cell">
                              <span className="cs-slot-day">{schedule.dayLine}</span>
                              <span className={`cs-slot-badge${schedule.hasSchedule ? '' : ' is-unscheduled'}`}>
                                {schedule.slotLine}
                              </span>
                            </div>
                          </td>
                          <td className="cs-note">{row.note || '—'}</td>
                          <td className="cs-nowrap cs-small">{formatWhen(row.createdAt)}</td>
                          <td className="cs-nowrap">
                            <div className="cs-status-cell">
                              <span className={`cs-status cs-status--${String(row.status).toLowerCase()}`}>
                                {row.status}
                              </span>
                              <label className="cs-status-label" htmlFor={`cs-status-${row.id}`}>
                                Change status
                              </label>
                              <select
                                id={`cs-status-${row.id}`}
                                className="cs-status-select"
                                aria-label={`Update status for ${row.userName}`}
                                value={row.status}
                                disabled={updatingId === row.id}
                                onChange={(event) => {
                                  const next = event.target.value
                                  if (next && next !== row.status) {
                                    updateStatus(row, next)
                                  }
                                }}
                              >
                                <option value="PENDING">Pending</option>
                                <option value="CONTACTED">Contacted</option>
                                <option value="CLOSED">Closed</option>
                              </select>
                            </div>
                          </td>
                          <td>
                            <StaffStamp
                              name={row.statusUpdatedByName}
                              userId={row.statusUpdatedByUserId}
                              email={row.statusUpdatedByEmail || row.resolvedByEmail}
                              role={row.statusUpdatedByRole}
                              at={row.statusUpdatedAt || row.resolvedAt}
                              status={row.status}
                            />
                          </td>
                          <td className="cs-actions-cell">
                            <div className="cs-actions">
                              {row.status === 'PENDING' && (
                                <button
                                  type="button"
                                  disabled={updatingId === row.id}
                                  onClick={() => updateStatus(row, 'CONTACTED')}
                                >
                                  Mark contacted
                                </button>
                              )}
                              {row.status !== 'CLOSED' && (
                                <button
                                  type="button"
                                  className="is-close"
                                  disabled={updatingId === row.id}
                                  onClick={() => updateStatus(row, 'CLOSED')}
                                >
                                  Close request
                                </button>
                              )}
                              {row.status === 'CLOSED' && (
                                <button
                                  type="button"
                                  className="is-reopen"
                                  disabled={updatingId === row.id}
                                  onClick={() => updateStatus(row, 'PENDING')}
                                >
                                  Reopen
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>

        <div className="cs-toasts" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className="cs-toast">
              <span className={`cs-toast-dot cs-toast-dot--${t.tone}`} />
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      </div>
      <SiteFooter />
    </>
  )
}
