import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { getMediaUrl, isVideo } from '../utils/mediaUrl';
import './MediaModal.css';

/**
 * Enlarged photo/video viewer. Closing is intentionally restricted to the ✕ button:
 * backdrop clicks and Escape do not dismiss it.
 */
const MediaModal = ({ activeMedia, mediaList, onClose, onNavigate }) => {
  const currentIndex = activeMedia ? (mediaList?.findIndex((m) => m.id === activeMedia.id) ?? -1) : -1;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < (mediaList?.length || 0) - 1;

  useEffect(() => {
    if (!activeMedia) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' && hasPrevious) onNavigate?.(mediaList[currentIndex - 1]);
      else if (e.key === 'ArrowRight' && hasNext) onNavigate?.(mediaList[currentIndex + 1]);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMedia, hasPrevious, hasNext, currentIndex, mediaList, onNavigate]);

  if (!activeMedia) return null;

  const mediaSrc = getMediaUrl(activeMedia);
  const isVideoMedia = isVideo(activeMedia);

  return createPortal(
    <div className="media-viewer" role="dialog" aria-modal="true" aria-label="Media preview">
      <button
        type="button"
        className="media-viewer-close"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close preview"
        title="Close"
        autoFocus
      >
        <X size={26} strokeWidth={2.75} />
      </button>

      {hasPrevious && (
        <button
          type="button"
          className="media-viewer-nav media-viewer-nav--prev"
          onClick={() => onNavigate?.(mediaList[currentIndex - 1])}
          aria-label="Previous media"
        >
          ‹
        </button>
      )}

      {hasNext && (
        <button
          type="button"
          className="media-viewer-nav media-viewer-nav--next"
          onClick={() => onNavigate?.(mediaList[currentIndex + 1])}
          aria-label="Next media"
        >
          ›
        </button>
      )}

      <div className="media-viewer-content">
        {isVideoMedia ? (
          <video src={mediaSrc} controls autoPlay className="media-viewer-media">
            Your browser does not support the video tag.
          </video>
        ) : (
          <img src={mediaSrc} alt={activeMedia.caption || 'Preview'} className="media-viewer-media" />
        )}

        {activeMedia.caption && <p className="media-viewer-caption">{activeMedia.caption}</p>}

        {mediaList && mediaList.length > 1 && (
          <p className="media-viewer-counter">
            Item {currentIndex + 1} of {mediaList.length} - {isVideoMedia ? 'Video' : 'Photo'}
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default MediaModal;
