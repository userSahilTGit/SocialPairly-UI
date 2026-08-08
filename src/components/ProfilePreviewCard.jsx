import React, { useState } from 'react';
import { Eye, X, Camera, Play } from 'lucide-react';
import { getMediaUrl, isVideo } from '../utils/mediaUrl';

/**
 * Profile Preview Card with interactive segment bar navigation.
 * Clicking each segment bar switches the active preview slot.
 * Clicking "View" pops up the high-res view modal.
 */
export function ProfilePreviewCard({ mediaList = [], user = {}, onCancel, onSave, onMediaClick }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currentMedia = mediaList[activeIndex];

  const renderMedia = (media, className = 'preview-image') => {
    if (!media) return null;
    const src = getMediaUrl(media);
    return media.mediaType === 'PHOTO' ? (
      <img src={src} alt={`Media ${activeIndex + 1}`} className={className} />
    ) : (
      <video src={src} className={className} autoPlay muted loop playsInline />
    );
  };

  return (
    <div className="profile-preview-card">
      {/* Photo Container */}
      <div 
        className="preview-image-container"
        style={{ cursor: currentMedia ? 'pointer' : 'default' }}
        onClick={() => currentMedia && onMediaClick?.(currentMedia)}
      >
        {currentMedia ? (
          renderMedia(currentMedia)
        ) : (
          <div className="placeholder-text">
            <Camera size={36} style={{ opacity: 0.3 }} />
          </div>
        )}

        {/* User info overlay */}
        <div className="preview-overlay">
          <h4 style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: 0 }}>
            {user?.firstName || 'User'}, {user?.age || '?'}
          </h4>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: '2px 0 0' }}>
            {user?.aboutMe || 'No bio yet'}
          </p>
          {currentMedia?.caption && (
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11, margin: '6px 0 0', fontStyle: 'italic' }}>
              "{currentMedia.caption}"
            </p>
          )}
        </div>

        {currentMedia?.mediaType === 'VIDEO' && (
          <div className="preview-video-badge">
            <Play size={14} color="#fff" fill="#fff" />
          </div>
        )}
      </div>

      {/* Segment Indicator Bars - clickable to switch active slot */}
      <div className="segment-bar-container">
        {mediaList.map((media, idx) => (
          <button
            key={media.id || idx}
            onClick={() => setActiveIndex(idx)}
            className={`segment-bar ${idx === activeIndex ? 'active' : ''}`}
            aria-label={`Go to item ${idx + 1}`}
            title={`View item ${idx + 1}`}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="preview-actions">
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={onSave}>Save</button>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => setIsModalOpen(true)}
          disabled={!currentMedia}
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Eye size={12} /> View
        </button>
      </div>

      {/* Expanded Photo Popup Modal */}
      {isModalOpen && currentMedia && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-lightbox" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setIsModalOpen(false)} aria-label="Close">
              <X size={20} />
            </button>
            {currentMedia.mediaType === 'PHOTO' ? (
              <img
                src={getMediaUrl(currentMedia)}
                alt="Expanded preview"
                className="lightbox-image"
              />
            ) : (
              <video
                src={getMediaUrl(currentMedia)}
                className="lightbox-image"
                controls
                autoPlay
              />
            )}
            {currentMedia.caption && (
              <p className="lightbox-caption">"{currentMedia.caption}"</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePreviewCard;