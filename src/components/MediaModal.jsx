import React, { useEffect, useCallback } from 'react';
import { getMediaUrl, isVideo } from '../utils/mediaUrl';

const MediaModal = ({ activeMedia, mediaList, onClose, onNavigate }) => {
  if (!activeMedia) return null;

  const mediaSrc = getMediaUrl(activeMedia);
  const isVideoMedia = isVideo(activeMedia);
  const currentIndex = mediaList?.findIndex(m => m.id === activeMedia.id) ?? -1;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < (mediaList?.length || 0) - 1;

  // Handle Escape key press
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft' && hasPrevious) {
      onNavigate?.(mediaList[currentIndex - 1]);
    } else if (e.key === 'ArrowRight' && hasNext) {
      onNavigate?.(mediaList[currentIndex + 1]);
    }
  }, [onClose, onNavigate, hasPrevious, hasNext, currentIndex, mediaList]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handlePrevious = () => {
    if (hasPrevious) {
      onNavigate?.(mediaList[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onNavigate?.(mediaList[currentIndex + 1]);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={onClose}
    >
      {/* Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-3xl font-bold bg-white/20 hover:bg-white/40 rounded-full w-10 h-10 flex items-center justify-center transition z-10"
        aria-label="Close modal"
      >
        ✕
      </button>

      {/* Previous Button */}
      {hasPrevious && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrevious();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl font-bold bg-white/20 hover:bg-white/40 rounded-full w-12 h-12 flex items-center justify-center transition z-10"
          aria-label="Previous media"
        >
          ‹
        </button>
      )}

      {/* Next Button */}
      {hasNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl font-bold bg-white/20 hover:bg-white/40 rounded-full w-12 h-12 flex items-center justify-center transition z-10"
          aria-label="Next media"
        >
          ›
        </button>
      )}

      {/* Media Content */}
      <div 
        className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideoMedia ? (
          <video 
            src={mediaSrc} 
            controls 
            autoPlay 
            className="max-h-[85vh] max-w-[90vw] rounded-lg shadow-2xl"
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <img 
            src={mediaSrc} 
            alt={activeMedia.caption || 'Preview'} 
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
          />
        )}

        {/* Caption */}
        {activeMedia.caption && (
          <p className="text-white mt-4 text-center font-medium text-lg">
            {activeMedia.caption}
          </p>
        )}

        {/* Item Counter */}
        {mediaList && mediaList.length > 1 && (
          <p className="text-white/70 mt-2 text-sm">
            Item {currentIndex + 1} of {mediaList.length} - {isVideoMedia ? 'Video' : 'Photo'}
          </p>
        )}
      </div>
    </div>
  );
};

export default MediaModal;
