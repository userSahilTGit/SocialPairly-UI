import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Search, UserRound, X } from 'lucide-react'
import api from '../api/axios'
import Navbar from '../components/Navbar'
import SiteFooter from '../components/SiteFooter'
import { logClientError } from '../utils/safeLog'
import './AdminMediaModeration.css'

const PURPOSE_LABELS = {
  DL_FRONT: 'Driver license — front',
  DL_BACK: 'Driver license — back',
  ID_FRONT: 'State ID — front',
  ID_BACK: 'State ID — back',
  PASSPORT: 'Passport photo page',
}

function purposeLabel(code) {
  return PURPOSE_LABELS[code] || code || 'Document'
}

function typeLabel(code) {
  if (code === 'DRIVER_LICENSE') return "Driver's License"
  if (code === 'STATE_ID') return 'State ID'
  if (code === 'PASSPORT') return 'Passport'
  return code || '—'
}

function matchesSearch(group, rawQuery) {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return true
  const stripped = q
    .replace(/^#/, '')
    .replace(/^id\s*[:=]?\s*/, '')
    .replace(/^user\s*[:=]?\s*/, '')
    .trim()
  const userId = group.userId == null ? '' : String(group.userId)
  const name = (group.displayName || '').toLowerCase()
  const email = (group.email || '').toLowerCase()
  if (name.includes(q) || email.includes(q)) return true
  if (stripped && (userId === stripped || userId.includes(stripped) || name.includes(stripped))) return true
  return false
}

export default function AdminIdentityDocuments() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const { data } = await api.get('/admin/identity-documents')
        if (!cancelled) setGroups(Array.isArray(data) ? data : [])
      } catch (err) {
        logClientError('Failed to load identity documents', err)
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load identity documents.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(
    () => groups.filter((g) => matchesSearch(g, searchQuery)),
    [groups, searchQuery],
  )

  const totalDocs = useMemo(
    () => groups.reduce((n, g) => n + (g.documents?.length || 0), 0),
    [groups],
  )

  return (
    <>
      <Navbar />
      <div className="admin-moderation-page">
        <div className="admin-moderation-container">
          <div className="admin-moderation-header">
            <div className="admin-moderation-header-left">
              <BadgeCheck size={28} />
              <div>
                <h1>Identity Documents</h1>
                <p>Review government ID uploads (DL / State ID / Passport) by member. Images load via the secure stream API.</p>
              </div>
            </div>
            <Link to="/admin/media" className="btn btn-secondary">Media moderation</Link>
          </div>

          <div className="admin-moderation-stats" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <div className="card" style={{ padding: 16, margin: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Members with ID uploads</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{groups.length}</div>
            </div>
            <div className="card" style={{ padding: 16, margin: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Total ID images</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{totalDocs}</div>
            </div>
          </div>

          <div className="admin-moderation-filters">
            <div className="admin-moderation-search">
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input
                type="search"
                placeholder="Search by name, email, or user ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search identity documents by user"
              />
            </div>
          </div>

          {error && <div className="alert alert-error" role="alert">{error}</div>}

          {loading ? (
            <div className="dashboard-loading">Loading identity documents…</div>
          ) : filtered.length === 0 ? (
            <div className="admin-moderation-empty">
              <BadgeCheck size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p>
                {groups.length === 0
                  ? 'No members have uploaded identity documents yet.'
                  : 'No members match your search.'}
              </p>
            </div>
          ) : (
            <div className="admin-moderation-groups">
              {filtered.map((group) => (
                <section
                  key={group.userId}
                  className="admin-moderation-user-group"
                  aria-labelledby={`id-docs-user-${group.userId}`}
                >
                  <header className="admin-moderation-user-header">
                    <div className="admin-moderation-user-avatar" aria-hidden="true">
                      <UserRound size={18} />
                    </div>
                    <div className="admin-moderation-user-title">
                      <h2 id={`id-docs-user-${group.userId}`}>{group.displayName || 'Unknown user'}</h2>
                      <p>
                        User ID: <strong>{group.userId}</strong>
                        {group.email ? <span className="admin-moderation-user-meta"> · {group.email}</span> : null}
                        <span className="admin-moderation-user-meta">
                          {' '}· {group.documents?.length || 0} document{(group.documents?.length || 0) === 1 ? '' : 's'}
                        </span>
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                        Type: <strong>{typeLabel(group.idDocumentType)}</strong>
                        {group.idDocumentNumberMasked
                          ? <> · Number: <strong>{group.idDocumentNumberMasked}</strong></>
                          : null}
                      </p>
                    </div>
                  </header>

                  <div className="admin-moderation-grid">
                    {(group.documents || []).map((doc) => (
                      <div
                        key={doc.documentId}
                        className="card admin-moderation-card"
                        style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}
                      >
                        <button
                          type="button"
                          className="admin-moderation-thumb"
                          onClick={() => setPreview({ ...doc, userId: group.userId, displayName: group.displayName })}
                          aria-label={`View ${purposeLabel(doc.docPurpose)} for user ${group.userId}`}
                        >
                          <img
                            src={doc.streamUrl || `/api/onboarding/identity/documents/${doc.documentId}/stream`}
                            alt=""
                            loading="lazy"
                          />
                          <div className="admin-moderation-thumb-badges">
                            <span className="admin-moderation-type-pill">{purposeLabel(doc.docPurpose)}</span>
                          </div>
                        </button>
                        <div style={{ padding: 12 }}>
                          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 8px' }}>
                            Doc ID: #{doc.documentId}
                            {doc.fileSizeKb != null ? ` · ${Math.round(doc.fileSizeKb)} KB` : ''}
                            {doc.contentType ? ` · ${doc.contentType}` : ''}
                          </p>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ width: '100%', fontSize: 13, padding: '8px 10px' }}
                            onClick={() => setPreview({ ...doc, userId: group.userId, displayName: group.displayName })}
                          >
                            View full size
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {preview && (
        <div className="modal-overlay" role="presentation" onClick={() => setPreview(null)}>
          <div
            className="modal admin-moderation-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Identity document preview"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 720 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 18, margin: 0 }}>{purposeLabel(preview.docPurpose)}</h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
                  {preview.displayName} · User ID {preview.userId} · Doc #{preview.documentId}
                </p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => setPreview(null)} aria-label="Close preview">
                <X size={16} />
              </button>
            </div>
            <div className="admin-moderation-preview-stage">
              <img
                src={preview.streamUrl || `/api/onboarding/identity/documents/${preview.documentId}/stream`}
                alt={purposeLabel(preview.docPurpose)}
                style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', background: '#000' }}
              />
            </div>
          </div>
        </div>
      )}

      <SiteFooter />
    </>
  )
}
