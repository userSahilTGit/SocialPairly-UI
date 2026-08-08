import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { getMediaUrl } from '../utils/mediaUrl';
import { Eye, X } from 'lucide-react';

export default function MediaPreviewModal({ userId, onClose }) {
  const [viewMode, setViewMode] = useState('PUBLIC'); // 'PUBLIC' | 'VERIFIED' | 'MUTUAL'
  const [previewMedia, setPreviewMedia] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/users/${userId}/media?mode=${viewMode}`);
        setPreviewMedia(res.data || []);
      } catch (err) {
        console.error('Failed to load preview', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPreview();
  }, [userId, viewMode]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 900, width: '90%' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700 }}>Preview As Others See It</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24 }}>
            <X size={24} />
          </button>
        </div>

        {/* Perspective Switcher */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { key: 'PUBLIC', label: 'Public User' },
            { key: 'VERIFIED', label: 'Verified User' },
            { key: 'MUTUAL', label: 'Mutual Interest' },
          ].map((mode) => (
            <button
              key={mode.key}
              onClick={() => setViewMode(mode.key)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: viewMode === mode.key ? 'var(--primary)' : '#e5e7eb',
                color: viewMode === mode.key ? '#fff' : 'var(--text)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Media Grid */}
        {loading ? (
          <div className="center">Loading preview...</div>
        ) : previewMedia.length === 0 ? (
          <div className="center" style={{ padding: 40 }}>
            <Eye size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ color: 'var(--muted)' }}>No media visible in {viewMode} mode.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
          }}>
            {previewMedia.map((item) => (
              <div
                key={item.id}
                style={{
                  aspectRatio: '4/5',
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '2px solid var(--border)',
                  position: 'relative',
                  background: '#000',
                }}
              >
                {item.mediaType === 'PHOTO' ? (
                  <img
                    src={getMediaUrl(item)}
                    alt={item.mediaCategory}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <video
                    src={getMediaUrl(item)}
                    controls
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
                <span style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  background: 'rgba(0,0,0,0.7)',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  {item.mediaCategory}
                </span>
                {item.privacyMode && item.privacyMode !== 'PUBLIC' && (
                  <span style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'var(--primary)',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 700,
                  }}>
                    {item.privacyMode}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}