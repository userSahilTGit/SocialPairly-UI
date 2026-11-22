import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Star } from 'lucide-react'
import Navbar from '../components/Navbar'
import SiteFooter from '../components/SiteFooter'
import api from '../api/axios'
import { notifyRatingsInboxChanged } from '../utils/supportInbox'
import './AdminRatings.css'

function formatWhen(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function StarsDisplay({ value }) {
  const stars = Number(value) || 0
  return (
    <span className="ratings-stars" aria-label={`${stars} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={15}
          className={n <= stars ? 'is-filled' : ''}
          fill={n <= stars ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
      ))}
      <span className="ratings-stars-count">{stars}/5</span>
    </span>
  )
}

export default function AdminRatings() {
  const [ratings, setRatings] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [spin, setSpin] = useState(false)
  const [starFilter, setStarFilter] = useState('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [listRes, summaryRes] = await Promise.all([
        api.get('/admin/ratings'),
        api.get('/admin/ratings/summary'),
      ])
      setRatings(listRes.data || [])
      setSummary(summaryRes.data || null)
      try {
        await api.post('/admin/ratings/notifications/mark-read')
        notifyRatingsInboxChanged()
      } catch {
        /* badge clear is best-effort */
      }
    } catch {
      setError('Failed to load member ratings.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleRefresh = async () => {
    setSpin(true)
    await load()
    setTimeout(() => setSpin(false), 550)
  }

  const filtered = starFilter === 'ALL'
    ? ratings
    : ratings.filter((row) => String(row.stars) === starFilter)

  return (
    <>
      <Navbar />
      <div className="ratings-console">
        <main className="ratings-main">
          <div className="ratings-page-head">
            <div>
              <p className="ratings-eyebrow">Super Admin · Admin · Customer Support</p>
              <h1>Ratings</h1>
              <p className="ratings-subtitle">
                Member Rate Us feedback (1–5 stars + suggestions). Visible only to Super Admin, Admin, and Customer Support.
              </p>
            </div>
            <button type="button" className="ratings-btn-refresh" onClick={handleRefresh} disabled={loading && spin}>
              <RefreshCw size={14} className={spin ? 'ratings-spin-once' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {error && <div className="ratings-alert" role="alert">{error}</div>}

          <section className="ratings-stats" aria-label="Ratings summary">
            <div className="ratings-stat-card">
              <span className="ratings-stat-label">Total ratings</span>
              <strong>{summary?.totalRatings ?? (loading ? '…' : 0)}</strong>
            </div>
            <div className="ratings-stat-card">
              <span className="ratings-stat-label">Average stars</span>
              <strong>{summary?.averageStars != null ? Number(summary.averageStars).toFixed(1) : (loading ? '…' : '0.0')}</strong>
            </div>
            {[5, 4, 3, 2, 1].map((n) => (
              <div className="ratings-stat-card ratings-stat-card--compact" key={n}>
                <span className="ratings-stat-label">{n}★</span>
                <strong>{summary?.countsByStars?.[String(n)] ?? 0}</strong>
              </div>
            ))}
          </section>

          <section className="ratings-card" aria-labelledby="ratings-table-heading">
            <div className="ratings-card-head">
              <h2 id="ratings-table-heading">Member feedback</h2>
              <div className="ratings-filters" role="tablist" aria-label="Filter by stars">
                {['ALL', '5', '4', '3', '2', '1'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={starFilter === value}
                    className={`ratings-filter${starFilter === value ? ' is-active' : ''}`}
                    onClick={() => setStarFilter(value)}
                  >
                    {value === 'ALL' ? 'All' : `${value}★`}
                  </button>
                ))}
              </div>
            </div>

            <div className="ratings-table-wrap">
              <table className="ratings-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Rating</th>
                    <th>Suggestion / Feedback</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && ratings.length === 0 ? (
                    <tr><td colSpan={4} className="ratings-empty-row">Loading ratings…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="ratings-empty-row">
                        No ratings{starFilter !== 'ALL' ? ` with ${starFilter} stars` : ''} yet.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <div className="ratings-member">{row.userName}</div>
                          <div className="ratings-muted">{row.userEmail}</div>
                        </td>
                        <td><StarsDisplay value={row.stars} /></td>
                        <td className="ratings-feedback">{row.suggestion || '—'}</td>
                        <td className="ratings-nowrap ratings-muted">{formatWhen(row.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
      <SiteFooter />
    </>
  )
}
