import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import VerifyPhotoModal from '../components/VerifyPhotoModal';
import VideoPromptModal from '../components/VideoPromptModal';
import ProfilePreviewCard from '../components/ProfilePreviewCard';
import MediaModal from '../components/MediaModal';
import { getMediaUrl, isVideo } from '../utils/mediaUrl';
import { BadgeCheck } from 'lucide-react';
import {
  Upload, Film, Image as ImageIcon, X, Check, GripVertical,
  ChevronLeft, ChevronRight, Play, Pencil, Trash2, Save,
  Eye, AlertCircle, Plus, CheckCircle2, Camera, LogOut, Video
} from 'lucide-react';

const MAX_MEDIA_SLOTS = 6;
const MAX_VIDEO_DURATION_SEC = 45;

// 👈 Media categories map to dedicated profile slots (Phase 2)
const MEDIA_CATEGORIES = ['FULL_LENGTH', 'PRIMARY', 'LIFESTYLE', 'HOBBY'];
const DEFAULT_CATEGORY = 'FULL_LENGTH';

// 👈 Privacy options for visibility control (Phase 2)
const PRIVACY_OPTIONS = ['PUBLIC', 'MUTUAL_ONLY'];
const DEFAULT_PRIVACY = 'PUBLIC';

// 👈 Validates video duration locally before upload (Phase 2)
// Uses an off-screen <video> element + URL.createObjectURL to read metadata
function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (Number.isFinite(video.duration)) {
        resolve(video.duration);
      } else {
        reject(new Error('Unable to read video duration.'));
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read this video file.'));
    };

    video.src = url;
  });
}

// 👈 Profile Readiness Banner - shows missing requirements before publishing
function ProfileReadinessBanner() {
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReadiness = async () => {
      try {
        // 👈 FIX: api instance already has baseURL '/api', so use the relative path.
        // Previously this was '/api/users/profile-readiness' which produced the
        // duplicate '/api/api/users/profile-readiness' 500 error.
        const res = await api.get('/users/profile-readiness');
        setReadiness(res.data);
      } catch (err) {
        console.error('Failed to load profile readiness', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReadiness();
  }, []);

  if (loading || !readiness) return null;

  // 👈 Suppress the auto-managed Full-length category and cover photo warnings.
  // These are assigned automatically on upload, so they should never block publishing.
  const filteredMissing = (readiness.missingRequirements || []).filter(
    (req) =>
      !req.toLowerCase().includes('full-length') &&
      !req.toLowerCase().includes('cover photo') &&
      !req.toLowerCase().includes('primary cover')
  );

  if (filteredMissing.length === 0) return null;

  return (
    <div style={{
      padding: 16,
      borderRadius: 12,
      background: '#fef3c7',
      border: '1px solid #fcd34d',
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <AlertCircle size={20} style={{ color: '#d97706', flexShrink: 0 }} />
        <p style={{ fontWeight: 600, color: '#92400e', margin: 0, fontSize: 14 }}>
          Complete your profile to publish
        </p>
      </div>
      <ul style={{ margin: 0, paddingLeft: 20, color: '#92400e', fontSize: 13 }}>
        {filteredMissing.map((req, idx) => (
          <li key={idx} style={{ marginBottom: 4 }}>{req}</li>
        ))}
      </ul>
    </div>
  );
}

export default function ProfileMediaPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [myMedia, setMyMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeStep, setActiveStep] = useState(1);
  const [editingMedia, setEditingMedia] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [activeMedia, setActiveMedia] = useState(null); // 👈 Modal lightbox state
  const fileInputRef = useRef(null);
  const dragItemRef = useRef(null);
  // 👈 Photo verification modal state (Step 5)
  const [showVerify, setShowVerify] = useState(false);
  
  // 👈 Video prompt selection state
  const [pendingVideoFile, setPendingVideoFile] = useState(null);
  const [showPromptSelect, setShowPromptSelect] = useState(false);

  const fetchMyMedia = useCallback(async () => {
    try {
      const res = await api.get('/media/my-uploads');
      const sorted = (res.data || []).sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
      // 👈 Normalize local state so UI preview matches backend defaults:
      // first photo is the cover, and photos default to FULL_LENGTH category.
      const hasCover = sorted.some((m) => m.mediaType === 'PHOTO' && m.isCover);
      const normalized = sorted.map((m, idx) => {
        if (m.mediaType !== 'PHOTO') return m;
        return {
          ...m,
          isCover: m.isCover || (!hasCover && idx === sorted.findIndex((x) => x.mediaType === 'PHOTO')),
          mediaCategory: m.mediaCategory || 'FULL_LENGTH',
        };
      });
      setMyMedia(normalized);
    } catch (err) {
      console.error('Failed to load user media', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyMedia();
  }, [fetchMyMedia]);

  // 👈 Upload a single resolved file (video or image)
  const doUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      // 👈 Assign default category + privacy on upload (backend uses PUBLIC default)
      await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return true;
    } catch (err) {
      setError(err.response?.data?.message || `Failed to upload ${file.name}`);
      return false;
    }
  };

  // 👈 Handles file selection: videos open the prompt modal first,
  // images upload directly
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const remaining = MAX_MEDIA_SLOTS - myMedia.length;
    if (remaining <= 0) {
      setError(`You can only upload up to ${MAX_MEDIA_SLOTS} media items. Remove some first.`);
      return;
    }

    const toUpload = files.slice(0, remaining);
    setError('');
    setSuccess('');

    const images = [];
    const videos = [];
    toUpload.forEach((file) => {
      if (file.type.startsWith('video/')) videos.push(file);
      else if (file.type.startsWith('image/')) images.push(file);
    });

    // ---- If a video is selected, hold it and open the prompt modal ----
    if (videos.length > 0) {
      // Validate duration first
      try {
        const duration = await getVideoDuration(videos[0]);
        if (duration > MAX_VIDEO_DURATION_SEC) {
          setError(`Video "${videos[0].name}" is ${Math.round(duration)}s — maximum is ${MAX_VIDEO_DURATION_SEC}s.`);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
      } catch (durationErr) {
        setError(durationErr.message);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setPendingVideoFile(videos[0]);
      setShowPromptSelect(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // ---- Upload images directly (no crop/zoom) ----
    let uploaded = 0;
    setUploading(true);
    for (const file of images) {
      if (await doUpload(file)) {
        uploaded++;
        setUploadProgress(images.length > 0 ? Math.round((uploaded / images.length) * 100) : 0);
      }
    }
    setUploading(false);
    setUploadProgress(0);

    if (uploaded > 0) {
      setSuccess(`Successfully uploaded ${uploaded} media item(s)!`);
      await fetchMyMedia();
      setActiveStep(2);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 👈 Direct upload execution upon clicking ANY prompt option
  const handlePromptSelect = async (promptText) => {
    setShowPromptSelect(false);
    if (!pendingVideoFile) return;

    const file = pendingVideoFile;
    setPendingVideoFile(null);

    setUploading(true);
    const uploaded = await doUpload(file);
    setUploading(false);
    setUploadProgress(0);

    if (uploaded) {
      setSuccess('Video uploaded successfully!');
      await fetchMyMedia();
      setActiveStep(2);
    }
  };

  const handleDelete = async (mediaId) => {
    try {
      await api.delete(`/media/${mediaId}`);
      setSuccess('Media removed successfully.');
      await fetchMyMedia();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete media.');
    }
  };

  const handleUpdateCaption = async (mediaId, caption) => {
    try {
      await api.put(`/media/${mediaId}`, { caption, displayOrder: null });
      setSuccess('Caption updated!');
      setEditingMedia(null);
      await fetchMyMedia();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update caption.');
    }
  };

  // 👈 Helper to update a media item's category/privacy/cover locally (Phase 2)
  const updateMediaField = (mediaId, field, value) => {
    setMyMedia((prev) => prev.map((m) => (m.id === mediaId ? { ...m, [field]: value } : m)));
  };

  const handleSaveCanvas = async (redirect = true) => {
    try {
      for (let i = 0; i < myMedia.length; i++) {
        const m = myMedia[i];
        await api.put(`/media/${m.id}`, {
          caption: m.caption || '',
          displayOrder: i + 1,
          // 👈 Persist category + privacy + cover (Phase 2)
          mediaCategory: m.mediaCategory || DEFAULT_CATEGORY,
          privacyMode: m.privacyMode || DEFAULT_PRIVACY,
          isCover: !!m.isCover,
        });
      }
      setSuccess('Media canvas saved!');
      await fetchMyMedia();
      await refreshUser();
      if (redirect) {
        navigate('/profile');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save canvas.');
    }
  };

  const handleCancelExit = () => {
    setShowCancelModal(false);
    navigate('/profile');
  };

  const moveItem = (from, to) => {
    if (to < 0 || to >= myMedia.length) return;
    const updated = [...myMedia];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setMyMedia(updated);
  };

  const handleDragStart = (index) => {
    dragItemRef.current = index;
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragItemRef.current === null || dragItemRef.current === index) return;
    moveItem(dragItemRef.current, index);
    dragItemRef.current = index;
  };

  const handleDragEnd = () => {
    dragItemRef.current = null;
    setDraggedIndex(null);
  };

  const previewMedia = myMedia.slice(0, MAX_MEDIA_SLOTS);

  const stepIndicator = (step) => {
    const steps = [
      { num: 1, label: 'Upload' },
      { num: 2, label: 'Library' },
      { num: 3, label: 'Canvas' },
    ];
    return (
      <div className="flex items-center gap-2 mb-6">
        {steps.map((s, idx) => (
          <React.Fragment key={s.num}>
            <button
              onClick={() => setActiveStep(s.num)}
              style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                background: activeStep === s.num ? 'var(--primary)' : '#e5e7eb',
                color: activeStep === s.num ? '#fff' : 'var(--muted)',
              }}
            >
              {s.num}
            </button>
            <span style={{
              fontSize: 13, fontWeight: activeStep === s.num ? 600 : 400,
              color: activeStep === s.num ? 'var(--text)' : 'var(--muted)',
            }}>{s.label}</span>
            {idx < steps.length - 1 && (
              <div style={{ width: 32, height: 1, background: '#e5e7eb' }} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container">
        <div className="center">Loading your media...</div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Photo verification modal (Step 5) */}
      {showVerify && (() => {
        // Find the cover photo URL: prefer the item marked isCover, fallback to first photo
        const coverMedia = myMedia.find((m) => m.isCover && m.mediaType === 'PHOTO') ||
                           myMedia.find((m) => m.mediaType === 'PHOTO');
        const coverPhotoUrl = coverMedia ? getMediaUrl(coverMedia) : null;
        return (
          <VerifyPhotoModal
            onClose={() => setShowVerify(false)}
            onVerified={() => {
              refreshUser();
              setSuccess('Congratulations — your profile is now verified!');
            }}
            coverPhotoUrl={coverPhotoUrl}
          />
        );
      })()}

      {/* Video prompt selection modal */}
      {showPromptSelect && (
        <VideoPromptModal
          onSelectPrompt={handlePromptSelect}
          onClose={() => {
            setShowPromptSelect(false);
            setPendingVideoFile(null);
          }}
        />
      )}

      {/* Cancel / Exit confirmation modal */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Leave Media Studio?</h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
              Are you sure you want to go back to your profile? Your unsaved changes may be lost.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCancelModal(false)}>
                Stay Here
              </button>
              <button type="button" className="btn btn-danger" onClick={handleCancelExit} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <LogOut size={16} /> Go to Profile
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-between" style={{ marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
            Your Media Story
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            Upload, arrange, and caption your best moments
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="badge badge-yes" style={{ fontSize: 13 }}>
            {myMedia.length}/{MAX_MEDIA_SLOTS} used
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowCancelModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', fontSize: 13 }}
          >
            <X size={16} /> Cancel
          </button>
        </div>
      </div>

      {/* Profile Readiness Banner */}
      <ProfileReadinessBanner />

      {stepIndicator(activeStep)}

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 24 }}>
        {/* Left: Main content */}
        <div>
          {/* STEP 1: Upload */}
          {activeStep === 1 && (
            <div className="card">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Upload size={20} style={{ color: 'var(--primary)' }} />
                Step 1: Upload Photos & Videos
              </h2>

              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border)', borderRadius: 12, padding: 32,
                  textAlign: 'center', cursor: 'pointer', marginBottom: 20,
                  background: uploading ? '#eef2ff' : 'transparent',
                  borderColor: uploading ? 'var(--primary)' : 'var(--border)',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
                {uploading ? (
                  <div>
                    <div className="progress-bar" style={{ maxWidth: 300, margin: '0 auto 12px' }}>
                      <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <p>Uploading... {uploadProgress}%</p>
                  </div>
                ) : (
                  <div>
                    <Camera size={40} style={{ color: 'var(--primary)', marginBottom: 12, opacity: 0.6 }} />
                    <p style={{ fontWeight: 600, marginBottom: 4 }}>Click to select media</p>
                    <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                      Photos (JPG, PNG) | Videos (Max 5MB) | Up to {MAX_MEDIA_SLOTS} items
                    </p>
                    <button className="btn" style={{ marginTop: 16 }}>
                      Upload Photo or Video
                    </button>
                  </div>
                )}

                {/* 👈 Verify identity button + verified badge (Step 5) */}
                <div
                  style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {user?.verified ? (
                    <p style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', fontSize: 14 }}>
                      <BadgeCheck size={18} /> Verified Profile
                    </p>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setShowVerify(true);
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <BadgeCheck size={16} /> Verify Your Identity
                    </button>
                  )}
                </div>
              </div>

              {/* 6-slot grid */}
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 10 }}>
                Your Media Slots
              </p>
              <div className="grid-6" style={{
                display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 16,
              }}>
                {Array.from({ length: MAX_MEDIA_SLOTS }).map((_, idx) => {
                  const item = previewMedia[idx];
                  return (
                    <div
                      key={idx}
                      style={{
                        aspectRatio: '4/5', borderRadius: 10, overflow: 'hidden',
                        border: `2px solid ${item ? 'var(--primary)' : 'var(--border)'}`,
                        background: item ? '#000' : '#f9fafb',
                        position: 'relative',
                        borderStyle: item ? 'solid' : 'dashed',
                      }}
                    >
                      {item ? (
                        <div 
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                          onClick={() => setActiveMedia(item)}
                        >
                          {item.mediaType === 'PHOTO' ? (
                            <img src={getMediaUrl(item)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                              <video src={getMediaUrl(item)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                                <Play size={18} color="#fff" fill="#fff" />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                          <Plus size={20} style={{ color: 'var(--muted)', opacity: 0.4 }} />
                        </div>
                      )}
                      <div style={{
                        position: 'absolute', top: 4, left: 4, background: 'var(--primary)', color: '#fff',
                        width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 10, fontWeight: 700,
                      }}>
                        {idx + 1}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCancelModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <X size={16} /> Cancel
                </button>
                <button
                  onClick={() => setActiveStep(2)}
                  disabled={myMedia.length === 0}
                  className="btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  Next: Library
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Library */}
          {activeStep === 2 && (
            <div className="card">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ImageIcon size={20} style={{ color: 'var(--primary)' }} />
                Step 2: Your Media Library
              </h2>

              {myMedia.length === 0 ? (
                <div className="center">
                  <Film size={48} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <p>No media uploaded yet.</p>
                  <button className="btn" style={{ marginTop: 12 }} onClick={() => setActiveStep(1)}>
                    Go to Upload
                  </button>
                </div>
              ) : (
                <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                  {myMedia.map((m, idx) => (
                    <div
                      key={m.id}
                      style={{
                        aspectRatio: '4/5', borderRadius: 10, overflow: 'hidden',
                        border: '2px solid var(--border)', position: 'relative', background: '#000',
                        cursor: 'pointer',
                      }}
                    >
                      {m.mediaType === 'PHOTO' ? (
                        <img src={getMediaUrl(m)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                          <video src={getMediaUrl(m)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', borderRadius: '50%', padding: 4 }}>
                            <Play size={14} color="#fff" fill="#fff" />
                          </div>
                        </div>
                      )}
                      <div style={{
                        position: 'absolute', top: 6, left: 6, background: 'var(--primary)', color: '#fff',
                        width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 12, fontWeight: 700,
                      }}>
                        {idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCancelModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <X size={16} /> Cancel
                  </button>
                  <button className="btn btn-secondary" onClick={() => setActiveStep(1)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ChevronLeft size={16} /> Back to Upload
                  </button>
                </div>
                <button
                  onClick={() => setActiveStep(3)}
                  disabled={myMedia.length === 0}
                  className="btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  Next: Arrange <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Canvas & Order */}
          {activeStep === 3 && (
            <div className="card">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <GripVertical size={20} style={{ color: 'var(--primary)' }} />
                Step 3: Arrange & Caption
              </h2>

              {myMedia.length === 0 ? (
                <div className="center">
                  <p>No media to arrange. Upload something first!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {myMedia.map((m, idx) => (
                    <div
                      key={m.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: 12, borderRadius: 10, border: `1px solid ${draggedIndex === idx ? 'var(--primary)' : 'var(--border)'}`,
                        background: draggedIndex === idx ? '#eef2ff' : 'var(--card)',
                      }}
                    >
                      <div style={{ cursor: 'grab', color: 'var(--muted)' }}>
                        <GripVertical size={18} />
                      </div>
                      <div style={{ width: 60, height: 72, borderRadius: 8, overflow: 'hidden', background: '#000', flexShrink: 0 }}>
                        {m.mediaType === 'PHOTO' ? (
                          <img src={getMediaUrl(m)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                            <video src={getMediaUrl(m)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <Play size={14} color="#fff" fill="#fff" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
                          </div>
                        )}
                      </div>
                      <span style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'monospace', width: 30 }}>#{idx + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {editingMedia?.id === m.id ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <input
                              type="text"
                              value={editingMedia.caption}
                              onChange={(e) => setEditingMedia({ ...editingMedia, caption: e.target.value })}
                              style={{ flex: 1, padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid var(--border)' }}
                              placeholder="Add a caption..."
                              autoFocus
                            />
                            <button className="btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleUpdateCaption(m.id, editingMedia.caption)}>
                              Save
                            </button>
                            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setEditingMedia(null)}>
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <p
                            style={{ fontSize: 13, color: m.caption ? 'var(--text)' : 'var(--muted)', fontStyle: m.caption ? 'normal' : 'italic', cursor: 'pointer', margin: 0 }}
                            onClick={() => setEditingMedia({ id: m.id, caption: m.caption || '', displayOrder: m.displayOrder })}
                          >
                            {m.caption || 'Click to add caption...'}
                          </p>
                        )}
                        {/* 👈 Category + Privacy + Cover controls (Phase 2) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                          <label style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            Slot
                            <select
                              value={m.mediaCategory || DEFAULT_CATEGORY}
                              onChange={(e) => updateMediaField(m.id, 'mediaCategory', e.target.value)}
                              style={{ padding: '4px 6px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)' }}
                            >
                              {MEDIA_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </label>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Privacy</span>
                            {PRIVACY_OPTIONS.map((privacy) => (
                              <label key={privacy} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                                <input
                                  type="radio"
                                  name={`privacy-${m.id}`}
                                  checked={(m.privacyMode || DEFAULT_PRIVACY) === privacy}
                                  onChange={() => updateMediaField(m.id, 'privacyMode', privacy)}
                                />
                                {privacy}
                              </label>
                            ))}
                          </div>

                          {m.mediaType === 'PHOTO' && (
                            <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={!!m.isCover}
                                onChange={(e) => updateMediaField(m.id, 'isCover', e.target.checked)}
                              />
                              Cover
                            </label>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setEditingMedia({ id: m.id, caption: m.caption || '', displayOrder: m.displayOrder })}
                          title="Edit caption"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(m.id)}
                          title="Delete media"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCancelModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <X size={16} /> Cancel
                  </button>
                  <button className="btn btn-secondary" onClick={() => setActiveStep(2)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ChevronLeft size={16} /> Back
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Plus size={16} /> Add More
                  </button>
                  <button
                    onClick={() => handleSaveCanvas(true)}
                    disabled={myMedia.length === 0}
                    className="btn"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Save size={18} />
                    SAVE MEDIA CANVAS
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Profile Preview */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 84 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, margin: 0 }}>
                <Eye size={16} style={{ color: 'var(--primary)' }} />
                Profile Preview
              </h3>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'block' }} />
            </div>

            {/* Interactive Profile Preview Card with segment bar navigation & view modal */}
            <ProfilePreviewCard
              mediaList={previewMedia}
              user={user}
              onCancel={() => setShowCancelModal(true)}
              onSave={() => handleSaveCanvas(true)}
              onMediaClick={setActiveMedia}
            />

            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>
              {previewMedia.length === 0
                ? 'No media on your profile card yet'
                : `${previewMedia.length} item(s) · ${previewMedia.filter(m => m.mediaType === 'PHOTO').length} photos · ${previewMedia.filter(m => m.mediaType === 'VIDEO').length} videos`
              }
            </div>
          </div>
        </div>
      </div>

      {/* Media Lightbox Modal */}
      <MediaModal
        activeMedia={activeMedia}
        mediaList={myMedia}
        onClose={() => setActiveMedia(null)}
        onNavigate={setActiveMedia}
      />
    </div>
  );
}
