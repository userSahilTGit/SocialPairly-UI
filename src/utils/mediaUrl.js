/**
 * Media URL Utility
 * 
 * Handles proper URL construction for media streaming from the backend.
 * The backend provides relative paths like "/api/media/{id}/stream"
 * which need to be combined with the API base URL.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * Constructs a full media URL from a media object or path
 * 
 * @param {Object|string} media - Media object with mediaUrl property or a string path
 * @returns {string} Full URL to the media stream endpoint
 * 
 * @example
 * getMediaUrl({ mediaUrl: '/api/media/123/stream' })
 * // Returns: 'http://localhost:8080/api/media/123/stream'
 * 
 * @example
 * getMediaUrl('/api/media/123/stream')
 * // Returns: 'http://localhost:8080/api/media/123/stream'
 */
export const getMediaUrl = (media) => {
  if (!media) return '';
  
  // If it's already a full URL (starts with http:// or https://), return as-is
  if (typeof media === 'string') {
    return media.startsWith('http') ? media : `${API_URL}${media}`;
  }
  
  // If it's an object, extract the mediaUrl property
  const mediaPath = media.mediaUrl || media.url || '';
  
  if (!mediaPath) return '';
  
  // If already a full URL, return as-is
  if (mediaPath.startsWith('http')) {
    return mediaPath;
  }
  
  // Otherwise, prepend the API base URL
  return `${API_URL}${mediaPath}`;
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
  isVideo,
  createBlobUrl,
  revokeBlobUrl
};