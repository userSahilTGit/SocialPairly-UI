import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { getMediaUrl } from '../utils/mediaUrl';
import Navbar from '../components/Navbar';
import SiteFooter from '../components/SiteFooter';
import { ShieldAlert, Search, X, CheckCircle2, Play, Clock, MessageSquare } from 'lucide-react';
import './AdminMediaModeration.css';

export default function AdminMediaModeration() {
  const [allMedia, setAllMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState(null);
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
      console.error('Failed to load media for moderation', err);
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
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (m) => (m.userName || '').toLowerCase().includes(q) || String(m.userId).includes(q)
      );
    }
    return [...result].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [allMedia, typeFilter, searchQuery]);

  const stats = useMemo(() => ({
    total: allMedia.length,
    active: allMedia.filter((m) => m.status === 'APPROVED').length,
    rejected: allMedia.filter((m) => m.status === 'REJECTED').length,
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
                <p>Post-moderation: review all live media and take down violating content</p>
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
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by user name..."
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
          ) : filteredMedia.length === 0 ? (
            <div className="admin-moderation-empty">
              <ShieldAlert size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p>{allMedia.length === 0 ? 'No users have uploaded any media yet.' : 'No media matches your filters.'}</p>
            </div>
          ) : (
            <div className="admin-moderation-grid">
              {filteredMedia.map((item) => (
                <div
                  key={item.id}
                  className="card"
                  style={{
                    padding: 0, overflow: 'hidden', marginBottom: 0,
                    opacity: item.status === 'REJECTED' ? 0.6 : 1,
                    border: item.status === 'REJECTED' ? '2px solid #fecaca' : item.status === 'APPROVED' ? '2px solid #bbf7d0' : '2px solid var(--border)',
                  }}
                >
                  <div style={{ aspectRatio: '4/5', background: '#000', position: 'relative', overflow: 'hidden' }}>
                    {item.mediaType === 'PHOTO' ? (
                      <img src={getMediaUrl(item)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <video src={getMediaUrl(item)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Play size={18} color="#fff" fill="#fff" />
                          </div>
                        </div>
                      </div>
                    )}

                    <div style={{ position: 'absolute', top: 8, left: 8 }}>
                      <span className={`badge ${item.status === 'APPROVED' ? 'badge-yes' : item.status === 'REJECTED' ? 'badge-no' : ''}`} style={{ fontSize: 11 }}>
                        {item.status === 'APPROVED' && <><CheckCircle2 size={12} style={{ marginRight: 2 }} /> Live</>}
                        {item.status === 'REJECTED' && <><X size={12} style={{ marginRight: 2 }} /> Taken Down</>}
                        {item.status === 'PENDING' && 'Pending'}
                      </span>
                    </div>
                    <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '2px 8px', borderRadius: 999, fontSize: 10 }}>
                      {item.mediaType === 'PHOTO' ? '📷 Photo' : '🎬 Video'}
                    </div>

                    {item.status === 'REJECTED' && item.rejectionReason && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(185,28,28,0.85))', padding: '24px 10px 8px' }}>
                        <p style={{ color: '#fff', fontSize: 10, margin: 0 }}>
                          <strong>Reason:</strong> {item.rejectionReason}
                        </p>
                      </div>
                    )}
                  </div>

                  <div style={{ padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--danger)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                        {(item.userName || 'U')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{item.userName || 'Unknown User'}</p>
                        <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>ID: #{item.userId}</p>
                      </div>
                    </div>

                    {item.status === 'APPROVED' && (
                      <button
                        onClick={() => setSelectedAction({ id: item.id, userName: item.userName, mediaUrl: item.mediaUrl, mediaType: item.mediaType })}
                        className="btn btn-danger btn-block"
                        style={{ fontSize: 13, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        <X size={14} />
                        Take Down
                      </button>
                    )}
                    {item.status === 'REJECTED' && (
                      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', padding: '8px 0' }}>
                        Content taken down
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
                      This will immediately remove media by <strong>{selectedAction.userName}</strong> from their live profile.
                    </p>
                  </div>
                </div>

                <div style={{ background: '#f3f4f6', borderRadius: 8, overflow: 'hidden', marginBottom: 16, maxHeight: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', maxHeight: 200, overflow: 'hidden' }}>
                    {selectedAction.mediaType === 'PHOTO' ? (
                      <img src={getMediaUrl(selectedAction)} alt="" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }} />
                    ) : (
                      <video src={getMediaUrl(selectedAction)} controls style={{ maxWidth: '100%', maxHeight: 200 }} />
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
