import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import Navbar from '../components/Navbar'
import SiteFooter from '../components/SiteFooter'
import api from '../api/axios'
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

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
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
                Premium callback requests and staff notifications for Super Admin, Admin, and Customer Support.
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
              A notification clears only after someone marks its callback <strong>contacted</strong> or{' '}
              <strong>closed</strong> in the queue below.
            </p>

            {loading && notifications.length === 0 ? (
              <p className="cs-empty">Loading notifications…</p>
            ) : notifications.length === 0 ? (
              <p className="cs-empty">No callback notifications yet.</p>
            ) : (
              <ul className="cs-notification-list">
                {notifications.slice(0, 20).map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`cs-notification${item.read ? '' : ' is-unread'}`}
                      onClick={() => jumpToCallback(item)}
                      title="Show in callback queue"
                    >
                      <div className="cs-notification-body">
                        <div className="cs-notification-title">
                          {!item.read && <span className="cs-dot" aria-hidden="true" />}
                          <h3>{item.title}</h3>
                        </div>
                        <p>{item.message}</p>
                        <span className="cs-time">{formatWhen(item.createdAt)}</span>
                        {item.read && (item.handledByName || item.handledByUserId) && (
                          <span className="cs-handled">
                            {STATUS_VERBS[item.callbackStatus] || 'Handled'} by{' '}
                            <strong>{item.handledByName || item.handledByEmail}</strong>{' '}
                            (ID #{item.handledByUserId ?? '—'} · {roleLabel(item.handledByRole)}) ·{' '}
                            {formatWhen(item.handledAt)}
                          </span>
                        )}
                      </div>
                      <span className={`cs-notification-state${item.read ? '' : ' is-pending'}`}>
                        {item.read ? 'Read' : 'Awaiting action'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="cs-card" aria-labelledby="cs-queue-heading" ref={queueRef}>
            <div className="cs-card-head cs-card-head--queue">
              <h2 id="cs-queue-heading">Callback queue</h2>
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
            </div>

            <div className="cs-table-wrap">
              <table className="cs-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Phone</th>
                    <th>Note</th>
                    <th>Requested</th>
                    <th>Status</th>
                    <th>Updated by</th>
                    <th className="cs-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && callbacks.length === 0 ? (
                    <tr><td colSpan={7} className="cs-empty-row">Loading callbacks…</td></tr>
                  ) : callbacks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="cs-empty-row">
                        No callback requests in <strong>{statusFilter}</strong> status.
                      </td>
                    </tr>
                  ) : (
                    callbacks.map((row) => (
                      <tr key={row.id} className={highlightId === row.id ? 'is-highlighted' : undefined}>
                        <td>
                          <div className="cs-member">{row.userName}</div>
                          <div className="cs-muted">{row.userEmail}</div>
                        </td>
                        <td className="cs-nowrap">
                          <a href={`tel:${row.phoneNumber}`}>{row.phoneNumber}</a>
                        </td>
                        <td className="cs-note">{row.note || '—'}</td>
                        <td className="cs-nowrap cs-small">{formatWhen(row.createdAt)}</td>
                        <td className="cs-nowrap">
                          <span className={`cs-status cs-status--${String(row.status).toLowerCase()}`}>
                            {row.status}
                          </span>
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
                        <td>
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
                                Close
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
                    ))
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
