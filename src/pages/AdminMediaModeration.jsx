import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { getMediaUrl } from '../utils/mediaUrl';
import { logClientError } from '../utils/safeLog';
import Navbar from '../components/Navbar';
import SiteFooter from '../components/SiteFooter';
import { ShieldAlert, Search, X, CheckCircle2, Play, Clock, MessageSquare, UserRound } from 'lucide-react';
import './AdminMediaModeration.css';

function matchesUserSearch(item, rawQuery) {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  const userId = item.userId == null ? '' : String(item.userId);
  const userName = (item.userName || '').toLowerCase();
  const stripped = q
    .replace(/^#/, '')
    .replace(/^id\s*[:=]?\s*/, '')
    .replace(/^user\s*[:=]?\s*/, '')
    .trim();

  if (userName.includes(q) || (stripped && userName.includes(stripped))) return true;
  if (userId && (userId === stripped || userId.includes(stripped))) return true;
  return false;
}

export default function AdminMediaModeration() {
  const [allMedia, setAllMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState(null);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAllMedia();
  }, []);

  const fetchAllMedia = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/media/all');
      setAllMedia(res.data || []);
    } catch (err) {
      logClientError('Failed to load media for moderation', err);
      setError('Failed to load media for moderation.');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeDown = async () => {
    if (!selectedAction) return;
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for taking down this media.');
      return;
    }

    setActionLoading(true);
    setError('');
    try {
      await api.put(`/admin/media/${selectedAction.id}/moderate`, {
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
      });
      setSuccess(`Media #${selectedAction.id} has been taken down. Reason: "${rejectionReason.trim()}"`);
      setSelectedAction(null);
      setRejectionReason('');
      fetchAllMedia();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to moderate media.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredMedia = useMemo(() => {
    let result = allMedia;
    if (typeFilter !== 'ALL') {
      result = result.filter((m) => m.mediaType === typeFilter);
    }
    if (searchQuery.trim()) {
      result = result.filter((m) => matchesUserSearch(m, searchQuery));
    }
    return [...result].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [allMedia, typeFilter, searchQuery]);

  const groupedByUser = useMemo(() => {
    const groups = new Map();
    for (const item of filteredMedia) {
      const key = item.userId == null ? 'unknown' : String(item.userId);
      if (!groups.has(key)) {
        groups.set(key, {
          userId: item.userId,
          userName: item.userName || 'Unknown User',
          items: [],
        });
      }
      const group = groups.get(key);
      if ((!group.userName || group.userName === 'Unknown User') && item.userName) {
        group.userName = item.userName;
      }
      group.items.push(item);
    }

    return Array.from(groups.values()).sort((a, b) => {
      const nameCmp = String(a.userName || '').localeCompare(String(b.userName || ''), undefined, {
        sensitivity: 'base',
      });
      if (nameCmp !== 0) return nameCmp;
      return Number(a.userId || 0) - Number(b.userId || 0);
    });
  }, [filteredMedia]);

  const stats = useMemo(() => ({
    total: allMedia.length,
    active: allMedia.filter((m) => m.status === 'APPROVED').length,
    rejected: allMedia.filter((m) => m.status === 'REJECTED').length,
    users: new Set(allMedia.map((m) => m.userId).filter((id) => id != null)).size,
  }), [allMedia]);

  return (
    <>
      <Navbar />
      <div className="admin-moderation-page">
        <div className="admin-moderation-container">
          <div className="admin-moderation-header">
            <div className="admin-moderation-header-left">
              <ShieldAlert size={28} style={{ color: 'var(--danger)', flexShrink: 0 }} />
              <div>
                <h1>Media Moderation Center</h1>
                <p>Post-moderation: review media grouped by user, then take down violating content</p>
              </div>
            </div>
            <button className="btn btn-secondary" onClick={fetchAllMedia} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={16} />
              Refresh
            </button>
          </div>

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <div className="admin-moderation-stats">
            {[
              { label: 'Users with Media', value: stats.users, color: 'var(--text)' },
              { label: 'Total Media', value: stats.total, color: 'var(--text)' },
              { label: 'Active (Live)', value: stats.active, color: 'var(--success)' },
              { label: 'Taken Down', value: stats.rejected, color: 'var(--danger)' },
            ].map((stat) => (
              <div className="stat-card" key={stat.label}>
                <div className="value" style={{ color: stat.color, fontSize: 28 }}>{stat.value}</div>
                <div className="label">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="admin-moderation-filters">
            <div className="admin-moderation-filter-btns">
              {[
                { label: 'All Media', value: 'ALL' },
                { label: 'Photos', value: 'PHOTO' },
                { label: 'Videos', value: 'VIDEO' },
              ].map((f) => (
                <button
                  key={f.value}
                  className={typeFilter === f.value ? 'btn' : 'btn btn-secondary'}
                  style={{ padding: '8px 16px', fontSize: 13 }}
                  onClick={() => setTypeFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="admin-moderation-search">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by user name or user ID"
                aria-label="Search by user name or user ID"
              />
              <Search size={16} className="admin-moderation-search-icon" />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="admin-moderation-search-clear" aria-label="Clear search">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="admin-moderation-empty">Loading media for moderation...</div>
          ) : groupedByUser.length === 0 ? (
            <div className="admin-moderation-empty">
              <ShieldAlert size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p>{allMedia.length === 0 ? 'No users have uploaded any media yet.' : 'No media matches your search or filters.'}</p>
            </div>
          ) : (
            <div className="admin-moderation-groups">
              {groupedByUser.map((group) => (
                <section
                  key={group.userId == null ? 'unknown' : group.userId}
                  className="admin-moderation-user-group"
                  aria-labelledby={`mod-user-${group.userId ?? 'unknown'}`}
                >
                  <header className="admin-moderation-user-header">
                    <div className="admin-moderation-user-avatar" aria-hidden="true">
                      <UserRound size={18} />
                    </div>
                    <div className="admin-moderation-user-title">
                      <h2 id={`mod-user-${group.userId ?? 'unknown'}`}>{group.userName}</h2>
                      <p>
                        User ID: <strong>{group.userId != null ? group.userId : '—'}</strong>
                        <span className="admin-moderation-user-meta"> · {group.items.length} media item{group.items.length === 1 ? '' : 's'}</span>
                      </p>
                    </div>
                  </header>

                  <div className="admin-moderation-grid">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="card admin-moderation-card"
                        style={{
                          padding: 0,
                          overflow: 'hidden',
                          marginBottom: 0,
                          opacity: item.status === 'REJECTED' ? 0.6 : 1,
                          border: item.status === 'REJECTED'
                            ? '2px solid #fecaca'
                            : item.status === 'APPROVED'
                              ? '2px solid #bbf7d0'
                              : '2px solid var(--border)',
                        }}
                      >
                        <button
                          type="button"
                          className="admin-moderation-thumb"
                          onClick={() => setPreviewMedia(item)}
                          aria-label={item.mediaType === 'VIDEO' ? `Play video #${item.id}` : `View photo #${item.id}`}
                        >
                          {item.mediaType === 'PHOTO' ? (
                            <img src={getMediaUrl(item)} alt="" loading="lazy" />
                          ) : (
                            <div className="admin-moderation-video-placeholder">
                              <span className="admin-moderation-play-btn">
                                <Play size={22} color="#fff" fill="#fff" />
                              </span>
                              <span className="admin-moderation-video-label">Click to play video</span>
                            </div>
                          )}

                          <div className="admin-moderation-thumb-badges">
                            <span className={`badge ${item.status === 'APPROVED' ? 'badge-yes' : item.status === 'REJECTED' ? 'badge-no' : ''}`} style={{ fontSize: 11 }}>
                              {item.status === 'APPROVED' && <><CheckCircle2 size={12} style={{ marginRight: 2 }} /> Live</>}
                              {item.status === 'REJECTED' && <><X size={12} style={{ marginRight: 2 }} /> Taken Down</>}
                              {item.status === 'PENDING' && 'Pending'}
                            </span>
                            <span className="admin-moderation-type-pill">
                              {item.mediaType === 'PHOTO' ? '📷 Photo' : '🎬 Video'}
                            </span>
                          </div>

                          {item.status === 'REJECTED' && item.rejectionReason && (
                            <div className="admin-moderation-reject-banner">
                              <p><strong>Reason:</strong> {item.rejectionReason}</p>
                            </div>
                          )}
                        </button>

                        <div style={{ padding: 12 }}>
                          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 8px' }}>
                            Media ID: #{item.id}
                            {item.fileSizeKb != null ? ` · ${Math.round(item.fileSizeKb)} KB` : ''}
                          </p>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ flex: 1, fontSize: 13, padding: '8px 10px' }}
                              onClick={() => setPreviewMedia(item)}
                            >
                              {item.mediaType === 'VIDEO' ? 'Play' : 'View'}
                            </button>
                            {item.status === 'APPROVED' && (
                              <button
                                type="button"
                                onClick={() => setSelectedAction({
                                  id: item.id,
                                  userId: item.userId,
                                  userName: item.userName,
                                  mediaUrl: item.mediaUrl,
                                  mediaType: item.mediaType,
                                })}
                                className="btn btn-danger"
                                style={{ flex: 1, fontSize: 13, padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                              >
                                <X size={14} />
                                Take Down
                              </button>
                            )}
                          </div>
                          {item.status === 'REJECTED' && (
                            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', padding: '8px 0 0' }}>
                              Content taken down
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {previewMedia && (
            <div className="modal-overlay" onClick={() => setPreviewMedia(null)}>
              <div className="modal admin-moderation-preview-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                  <div>
                    <h2 style={{ fontSize: 18, margin: 0 }}>
                      {previewMedia.mediaType === 'VIDEO' ? 'Play Video' : 'View Photo'}
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
                      {previewMedia.userName || 'Unknown User'}
                      {previewMedia.userId != null ? ` · User ID ${previewMedia.userId}` : ''}
                      {` · Media #${previewMedia.id}`}
                    </p>
                  </div>
                  <button type="button" className="btn btn-secondary" onClick={() => setPreviewMedia(null)} aria-label="Close preview">
                    <X size={16} />
                  </button>
                </div>

                <div className="admin-moderation-preview-stage">
                  {previewMedia.mediaType === 'VIDEO' ? (
                    <video
                      key={previewMedia.id}
                      src={getMediaUrl(previewMedia)}
                      controls
                      autoPlay
                      playsInline
                      preload="metadata"
                      style={{ width: '100%', maxHeight: '70vh', background: '#000' }}
                    >
                      Your browser does not support video playback.
                    </video>
                  ) : (
                    <img
                      src={getMediaUrl(previewMedia)}
                      alt=""
                      style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', background: '#000' }}
                    />
                  )}
                </div>

                {previewMedia.status === 'APPROVED' && (
                  <div className="modal-actions" style={{ marginTop: 16 }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setPreviewMedia(null)}>
                      Close
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => {
                        setSelectedAction({
                          id: previewMedia.id,
                          userId: previewMedia.userId,
                          userName: previewMedia.userName,
                          mediaUrl: previewMedia.mediaUrl,
                          mediaType: previewMedia.mediaType,
                        });
                        setPreviewMedia(null);
                      }}
                    >
                      Take Down
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedAction && (
            <div className="modal-overlay" onClick={() => { setSelectedAction(null); setRejectionReason(''); }}>
              <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <ShieldAlert size={24} style={{ color: 'var(--danger)' }} />
                  <div>
                    <h2 style={{ fontSize: 18, margin: 0 }}>Take Down Media</h2>
                    <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                      This will immediately remove media by{' '}
                      <strong>{selectedAction.userName}</strong>
                      {selectedAction.userId != null ? ` (User ID: ${selectedAction.userId})` : ''}{' '}
                      from their live profile.
                    </p>
                  </div>
                </div>

                <div style={{ background: '#f3f4f6', borderRadius: 8, overflow: 'hidden', marginBottom: 16, maxHeight: 240 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', maxHeight: 240, overflow: 'hidden' }}>
                    {selectedAction.mediaType === 'PHOTO' ? (
                      <img src={getMediaUrl(selectedAction)} alt="" style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'contain' }} />
                    ) : (
                      <video
                        key={`takedown-${selectedAction.id}`}
                        src={getMediaUrl(selectedAction)}
                        controls
                        preload="metadata"
                        playsInline
                        style={{ maxWidth: '100%', maxHeight: 240 }}
                      />
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageSquare size={14} style={{ color: 'var(--danger)' }} />
                    Violation Reason <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Describe the violation (e.g., explicit content, inappropriate imagery, policy violation...)"
                    rows={3}
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => { setSelectedAction(null); setRejectionReason(''); }}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleTakeDown}
                    disabled={actionLoading || !rejectionReason.trim()}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {actionLoading ? 'Processing...' : <><X size={16} /> Confirm Take Down</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
