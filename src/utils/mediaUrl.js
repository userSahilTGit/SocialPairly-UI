/**
 * Media URL Utility
 * 
 * Handles proper URL construction for media streaming from the backend.
 * The backend provides relative paths like "/api/media/{id}/stream"
 * which need to be combined with the API base URL.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9010';

/**
 * Constructs a full media URL from a media object or path
 * 
 * @param {Object|string} media - Media object with mediaUrl property or a string path
 * @returns {string} Full URL to the media stream endpoint
 * 
 * @example
 * getMediaUrl({ mediaUrl: '/api/media/123/stream' })
 * // Returns: 'http://localhost:9010/api/media/123/stream'
 * 
 * @example
 * getMediaUrl('/api/media/123/stream')
 * // Returns: 'http://localhost:9010/api/media/123/stream'
 */
/** Disk-era avatars (`/uploads/...`) often 404; prefer BLOB stream URLs. */
export const isLegacyDiskPhoto = (path) => {
  if (!path || typeof path !== 'string') return false
  return path.includes('/uploads/')
}

const resolveMediaPath = (path) => {
  if (!path) return '';
  if (
    path.startsWith('blob:')
    || path.startsWith('data:')
    || path.startsWith('http://')
    || path.startsWith('https://')
  ) {
    return path;
  }
  // Same-origin /api paths go through the Vite proxy (and work with auth later)
  if (path.startsWith('/api/')) return path;
  return `${API_URL}${path}`;
};

export const getMediaUrl = (media) => {
  if (!media) return '';

  if (typeof media === 'string') {
    return resolveMediaPath(media);
  }

  return resolveMediaPath(media.mediaUrl || media.url || '');
};

/**
 * Checks if a media item is a video
 * 
 * @param {Object} media - Media object with mediaType property
 * @returns {boolean} True if the media is a video
 */
export const isVideo = (media) => {
  if (!media) return false;
  return media.mediaType === 'VIDEO' || 
         (media.mediaUrl && media.mediaUrl.match(/\.(mp4|webm|ogg)$/i));
};

/**
 * Creates a Blob URL for client-side file preview
 * Use this for immediate preview of files before upload
 * 
 * @param {File} file - File object from input[type="file"]
 * @returns {string} Blob URL for preview
 * 
 * @example
 * const previewUrl = createBlobUrl(file);
 * <img src={previewUrl} />
 */
export const createBlobUrl = (file) => {
  if (!file || !(file instanceof File)) {
    return '';
  }
  return URL.createObjectURL(file);
};

/**
 * Revokes a Blob URL to free memory
 * Call this when the component unmounts or when the preview is no longer needed
 * 
 * @param {string} blobUrl - Blob URL to revoke
 */
export const revokeBlobUrl = (blobUrl) => {
  if (blobUrl && blobUrl.startsWith('blob:')) {
    URL.revokeObjectURL(blobUrl);
  }
};

export default {
  getMediaUrl,
  isLegacyDiskPhoto,
  isVideo,
  createBlobUrl,
  revokeBlobUrl
};