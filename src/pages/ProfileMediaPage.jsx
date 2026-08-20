import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import SiteFooter from '../components/SiteFooter'
import VerifyPhotoModal from '../components/VerifyPhotoModal'
import VideoPromptModal from '../components/VideoPromptModal'
import MediaModal from '../components/MediaModal'
import { getMediaUrl } from '../utils/mediaUrl'
import { logClientError } from '../utils/safeLog'
import {
  UploadCloud, Film, Image as ImageIcon, X, Check, GripVertical,
  ChevronLeft, ChevronRight, Play, Pencil, Trash2, Save,
  AlertCircle, Plus, CheckCircle2, Camera, LogOut, Video,
  Star, Tag, Smartphone, ShieldCheck, CheckCheck, ArrowRight,
  LayoutGrid, Heart,
} from 'lucide-react'

const MAX_MEDIA_SLOTS = 6
const MAX_VIDEO_DURATION_SEC = 45
const MEDIA_CATEGORIES = ['FULL_LENGTH', 'PRIMARY', 'LIFESTYLE', 'HOBBY']
const DEFAULT_CATEGORY = 'FULL_LENGTH'
const PRIVACY_OPTIONS = ['PUBLIC', 'MUTUAL_ONLY']
const DEFAULT_PRIVACY = 'PUBLIC'

const STORY_PROMPTS = [
  'My favorite weekend spot',
  'A quick story about this photo',
  'Catch me in my element',
  'Sunday morning routine',
]

function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      if (Number.isFinite(video.duration)) resolve(video.duration)
      else reject(new Error('Unable to read video duration.'))
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read this video file.'))
    }
    video.src = url
  })
}

function ProfileReadinessBanner() {
  const [readiness, setReadiness] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReadiness = async () => {
      try {
        const res = await api.get('/users/profile-readiness')
        setReadiness(res.data)
      } catch (err) {
        logClientError('Failed to load profile readiness', err)
      } finally {
        setLoading(false)
      }
    }
    fetchReadiness()
  }, [])

  if (loading || !readiness) return null

  const filteredMissing = (readiness.missingRequirements || []).filter(
    (req) =>
      !req.toLowerCase().includes('full-length') &&
      !req.toLowerCase().includes('cover photo') &&
      !req.toLowerCase().includes('primary cover'),
  )
  if (filteredMissing.length === 0) return null

  return (
    <div className="ms-readiness">
      <div className="ms-readiness-head">
        <AlertCircle size={18} />
        <p>Complete your profile to publish</p>
      </div>
      <ul>
        {filteredMissing.map((req, idx) => (
          <li key={idx}>{req}</li>
        ))}
      </ul>
    </div>
  )
}

export default function ProfileMediaPage() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [myMedia, setMyMedia] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeStep, setActiveStep] = useState(1)
  const [editingMedia, setEditingMedia] = useState(null)
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [activeMedia, setActiveMedia] = useState(null)
  const fileInputRef = useRef(null)
  const dragItemRef = useRef(null)
  const [showVerify, setShowVerify] = useState(false)
  const [pendingVideoFile, setPendingVideoFile] = useState(null)
  const [showPromptSelect, setShowPromptSelect] = useState(false)
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [promptChoice, setPromptChoice] = useState(STORY_PROMPTS[0])
  const [previewProfile, setPreviewProfile] = useState({
    aboutMe: '',
    occupation: '',
    location: '',
    preferredName: '',
    age: null,
  })
  const [dragOverDropzone, setDragOverDropzone] = useState(false)

  const fetchMyMedia = useCallback(async () => {
    try {
      const res = await api.get('/media/my-uploads')
      const sorted = (res.data || []).sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999))
      const hasCover = sorted.some((m) => m.mediaType === 'PHOTO' && m.isCover)
      const normalized = sorted.map((m, idx) => {
        if (m.mediaType !== 'PHOTO') return m
        return {
          ...m,
          isCover: m.isCover || (!hasCover && idx === sorted.findIndex((x) => x.mediaType === 'PHOTO')),
          mediaCategory: m.mediaCategory || 'FULL_LENGTH',
        }
      })
      setMyMedia(normalized)
    } catch (err) {
      logClientError('Failed to load user media', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMyMedia()
  }, [fetchMyMedia])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [profileRes, identityRes] = await Promise.all([
          api.get('/profile').catch(() => null),
          api.get('/onboarding/identity').catch(() => null),
        ])
        if (cancelled) return
        const p = profileRes?.data?.profile
        const id = identityRes?.data
        const age = id?.age ?? user?.age ?? null
        setPreviewProfile({
          aboutMe: p?.aboutMe || '',
          occupation: p?.occupation || '',
          location: [id?.locationCity || p?.locationCity, id?.locationCountry || p?.locationCountry]
            .filter(Boolean)
            .join(', '),
          preferredName: id?.preferredName || user?.preferredName || user?.displayName || user?.firstName || 'Member',
          age,
        })
      } catch {
        /* ignore preview enrichment failures */
      }
    })()
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    if (myMedia.length === 0) {
      setSelectedSlotIndex(0)
      setPreviewIndex(0)
      return
    }
    if (selectedSlotIndex >= myMedia.length) setSelectedSlotIndex(0)
    if (previewIndex >= myMedia.length) setPreviewIndex(0)
  }, [myMedia, selectedSlotIndex, previewIndex])

  const doUpload = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return true
    } catch (err) {
      setError(err.response?.data?.message || `Failed to upload ${file.name}`)
      return false
    }
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    await processFiles(files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const processFiles = async (files) => {
    const remaining = MAX_MEDIA_SLOTS - myMedia.length
    if (remaining <= 0) {
      setError(`You can only upload up to ${MAX_MEDIA_SLOTS} media items. Remove some first.`)
      return
    }

    const toUpload = files.slice(0, remaining)
    setError('')
    setSuccess('')

    const images = []
    const videos = []
    toUpload.forEach((file) => {
      if (file.type.startsWith('video/')) videos.push(file)
      else if (file.type.startsWith('image/')) images.push(file)
    })

    if (videos.length > 0) {
      try {
        const duration = await getVideoDuration(videos[0])
        if (duration > MAX_VIDEO_DURATION_SEC) {
          setError(`Video "${videos[0].name}" is ${Math.round(duration)}s — maximum is ${MAX_VIDEO_DURATION_SEC}s.`)
          return
        }
      } catch (durationErr) {
        setError(durationErr.message)
        return
      }
      setPendingVideoFile(videos[0])
      setShowPromptSelect(true)
      return
    }

    let uploaded = 0
    setUploading(true)
    for (const file of images) {
      if (await doUpload(file)) {
        uploaded++
        setUploadProgress(images.length > 0 ? Math.round((uploaded / images.length) * 100) : 0)
      }
    }
    setUploading(false)
    setUploadProgress(0)

    if (uploaded > 0) {
      setSuccess(`Successfully uploaded ${uploaded} media item(s)!`)
      await fetchMyMedia()
    }
  }

  const handlePromptSelect = async (_promptText) => {
    setShowPromptSelect(false)
    if (!pendingVideoFile) return
    const file = pendingVideoFile
    setPendingVideoFile(null)
    setUploading(true)
    const uploaded = await doUpload(file)
    setUploading(false)
    setUploadProgress(0)
    if (uploaded) {
      setSuccess('Video uploaded successfully!')
      await fetchMyMedia()
    }
  }

  const handleDelete = async (mediaId, e) => {
    e?.stopPropagation?.()
    if (myMedia.length <= 1) {
      setError('You need at least 1 primary photo for your profile.')
      return
    }
    try {
      await api.delete(`/media/${mediaId}`)
      setSuccess('Media removed successfully.')
      await fetchMyMedia()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete media.')
    }
  }

  const handleUpdateCaption = async (mediaId, caption) => {
    try {
      await api.put(`/media/${mediaId}`, { caption, displayOrder: null })
      setSuccess('Caption updated!')
      setEditingMedia(null)
      await fetchMyMedia()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update caption.')
    }
  }

  const attachPromptToSelected = async () => {
    const item = myMedia[selectedSlotIndex]
    if (!item) {
      setError('Select a filled media slot first.')
      return
    }
    await handleUpdateCaption(item.id, promptChoice)
  }

  const updateMediaField = (mediaId, field, value) => {
    setMyMedia((prev) => prev.map((m) => (m.id === mediaId ? { ...m, [field]: value } : m)))
  }

  const handleSaveCanvas = async (redirect = true) => {
    try {
      for (let i = 0; i < myMedia.length; i++) {
        const m = myMedia[i]
        await api.put(`/media/${m.id}`, {
          caption: m.caption || '',
          displayOrder: i + 1,
          mediaCategory: m.mediaCategory || DEFAULT_CATEGORY,
          privacyMode: m.privacyMode || DEFAULT_PRIVACY,
          isCover: !!m.isCover,
        })
      }
      setSuccess('Media canvas saved!')
      await fetchMyMedia()
      await refreshUser()
      if (redirect) navigate('/profile')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save canvas.')
    }
  }

  const handleCancelExit = () => {
    setShowCancelModal(false)
    navigate('/profile')
  }

  const moveItem = (from, to) => {
    if (to < 0 || to >= myMedia.length) return
    const updated = [...myMedia]
    const [moved] = updated.splice(from, 1)
    updated.splice(to, 0, moved)
    setMyMedia(updated)
  }

  const handleDragStart = (index) => {
    dragItemRef.current = index
    setDraggedIndex(index)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (dragItemRef.current === null || dragItemRef.current === index) return
    moveItem(dragItemRef.current, index)
    dragItemRef.current = index
  }

  const handleDragEnd = () => {
    dragItemRef.current = null
    setDraggedIndex(null)
  }

  const selectSlot = (index) => {
    if (!myMedia[index]) return
    setSelectedSlotIndex(index)
    setPreviewIndex(index)
  }

  const nextPreview = () => {
    if (myMedia.length === 0) return
    setPreviewIndex((i) => (i + 1) % myMedia.length)
  }

  const prevPreview = () => {
    if (myMedia.length === 0) return
    setPreviewIndex((i) => (i - 1 + myMedia.length) % myMedia.length)
  }

  const setAsPrimary = (index) => {
    if (!myMedia[index] || myMedia[index].mediaType !== 'PHOTO') return
    const updated = [...myMedia]
    const [moved] = updated.splice(index, 1)
    updated.unshift({ ...moved, isCover: true })
    setMyMedia(
      updated.map((m, i) => ({
        ...m,
        isCover: m.mediaType === 'PHOTO' ? i === 0 : false,
      })),
    )
    setSelectedSlotIndex(0)
    setPreviewIndex(0)
  }

  const previewMedia = myMedia.slice(0, MAX_MEDIA_SLOTS)
  const activePreview = previewMedia[previewIndex]
  const displayName = previewProfile.preferredName || user?.firstName || 'Member'
  const displayAge = previewProfile.age

  const stepBtn = (num, label) => (
    <button
      type="button"
      id={`step-btn-${num}`}
      onClick={() => setActiveStep(num)}
      className={`ms-step ${activeStep === num ? 'active' : ''}`}
    >
      <span className="ms-step-num">{num}</span>
      <span>{label}</span>
    </button>
  )

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="ms-page">
          <div className="center">Loading your media...</div>
        </div>
      </>
    )
  }

  const coverMedia =
    myMedia.find((m) => m.isCover && m.mediaType === 'PHOTO') ||
    myMedia.find((m) => m.mediaType === 'PHOTO')
  const coverPhotoUrl = coverMedia ? getMediaUrl(coverMedia) : null

  return (
    <>
      <Navbar />
      <div className="ms-page">
        {showVerify && (
          <VerifyPhotoModal
            onClose={() => setShowVerify(false)}
            onVerified={() => {
              refreshUser()
              setSuccess('Congratulations — your profile is now verified!')
            }}
            coverPhotoUrl={coverPhotoUrl}
          />
        )}

        {showPromptSelect && (
          <VideoPromptModal
            onSelectPrompt={handlePromptSelect}
            onClose={() => {
              setShowPromptSelect(false)
              setPendingVideoFile(null)
            }}
          />
        )}

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
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleCancelExit}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <LogOut size={16} /> Go to Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="ms-header">
          <div>
            <div className="ms-header-tags">
              <span className="ms-badge">Media Studio</span>
              <span className="ms-header-hint">• Drag & Drop Reordering</span>
            </div>
            <h1>Your Media Story</h1>
            <p>Upload, curate, and tag your highest performing photos & video prompts.</p>
          </div>

          <div className="ms-header-right">
            <div className="ms-slots-pill">
              <Star className="w-4 h-4 text-purple-600" />
              <span>{myMedia.length} / {MAX_MEDIA_SLOTS} Media Slots Used</span>
            </div>
            <button type="button" className="ms-cancel-btn" onClick={() => setShowCancelModal(true)}>
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>

        <div className="ms-stepper">
          {stepBtn(1, 'Upload & Order')}
          <ChevronRight className="ms-step-chevron" />
          {stepBtn(2, 'Prompts & Captions')}
          <ChevronRight className="ms-step-chevron" />
          {stepBtn(3, 'Canvas Preview')}
        </div>

        <ProfileReadinessBanner />
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div className="ms-layout">
          {/* LEFT */}
          <div className="ms-main">
            {activeStep === 1 && (
              <section className="ms-card">
                <div className="ms-card-top">
                  <div className="ms-card-title-row">
                    <div className="ms-icon-box rose">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h2>Step 1: Upload Photos & Videos</h2>
                      <p>First photo will be your main profile image shown in match cards.</p>
                    </div>
                  </div>
                  <span className="ms-auto-enhanced">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Auto-Enhanced
                  </span>
                </div>

                <div
                  className={`ms-dropzone ${uploading ? 'is-uploading' : ''} ${dragOverDropzone ? 'is-drag' : ''}`}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOverDropzone(true)
                  }}
                  onDragLeave={() => setDragOverDropzone(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOverDropzone(false)
                    const files = Array.from(e.dataTransfer.files || [])
                    if (files.length) processFiles(files)
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={uploading}
                  />
                  {uploading ? (
                    <div>
                      <div className="progress-bar" style={{ maxWidth: 300, margin: '0 auto 12px' }}>
                        <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <p>Uploading… {uploadProgress}%</p>
                    </div>
                  ) : (
                    <>
                      <div className="ms-drop-icon">
                        <Camera className="w-8 h-8" />
                      </div>
                      <h3>Drag & drop photos or video clips here</h3>
                      <p>High quality JPG, PNG or MP4 videos (Max 15MB each)</p>
                      <div className="ms-drop-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="ms-btn-brand"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Plus className="w-4 h-4" /> Select Files
                        </button>
                        {user?.verified ? (
                          <span className="ms-verified-inline">
                            <ShieldCheck className="w-4 h-4" /> Verified
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="ms-btn-outline"
                            onClick={() => setShowVerify(true)}
                          >
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            Verify Identity Selfie
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="ms-slots-block">
                  <div className="ms-slots-head">
                    <h3>
                      <LayoutGrid className="w-4 h-4 text-purple-600" />
                      Your Profile Media Slots ({MAX_MEDIA_SLOTS} Max)
                    </h3>
                    <span>Click a slot to preview · double-click photo to set as primary</span>
                  </div>

                  <div className="ms-slots-grid">
                    {Array.from({ length: MAX_MEDIA_SLOTS }).map((_, idx) => {
                      const item = previewMedia[idx]
                      if (!item) {
                        return (
                          <button
                            type="button"
                            key={`empty-${idx}`}
                            className="ms-slot empty"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <div className="ms-slot-plus"><Plus className="w-4 h-4" /></div>
                            <span>Slot {idx + 1}</span>
                          </button>
                        )
                      }
                      const isMain = idx === 0 || item.isCover
                      return (
                        <div
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          className={`ms-slot filled ${selectedSlotIndex === idx ? 'selected' : ''} ${isMain && idx === 0 ? 'main' : ''}`}
                          onClick={() => selectSlot(idx)}
                          onDoubleClick={() => setAsPrimary(idx)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') selectSlot(idx)
                          }}
                        >
                          {item.mediaType === 'PHOTO' ? (
                            <img src={getMediaUrl(item)} alt="" />
                          ) : (
                            <>
                              <video src={getMediaUrl(item)} muted />
                              <span className="ms-video-badge"><Video className="w-3 h-3" /> Video</span>
                              <span className="ms-play"><Play className="w-4 h-4" fill="currentColor" /></span>
                            </>
                          )}
                          {idx === 0 && (
                            <span className="ms-main-badge">
                              <Star className="w-3 h-3" fill="currentColor" /> Main
                            </span>
                          )}
                          <div className="ms-slot-footer">
                            <span>{idx + 1}</span>
                            <button
                              type="button"
                              className="ms-slot-del"
                              onClick={(e) => handleDelete(item.id, e)}
                              aria-label="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="ms-prompt-box">
                  <div className="ms-prompt-head">
                    <span>
                      <Tag className="w-3.5 h-3.5" /> Add Story Prompt Sticker to Selected Photo
                    </span>
                    <span className="ms-prompt-slot">
                      Editing Slot #{Math.min(selectedSlotIndex + 1, Math.max(myMedia.length, 1))}
                      {selectedSlotIndex === 0 ? ' (Primary)' : ''}
                    </span>
                  </div>
                  <div className="ms-prompt-row">
                    <select
                      value={promptChoice}
                      onChange={(e) => setPromptChoice(e.target.value)}
                    >
                      {STORY_PROMPTS.map((p) => (
                        <option key={p} value={p}>{`"${p}..."`}</option>
                      ))}
                    </select>
                    <button type="button" className="ms-btn-purple" onClick={attachPromptToSelected}>
                      Attach
                    </button>
                  </div>
                </div>

                <div className="ms-footer-bar">
                  <button
                    type="button"
                    className="ms-btn-outline"
                    onClick={() => {
                      setError('')
                      setSuccess('')
                      fetchMyMedia()
                    }}
                  >
                    Reset All
                  </button>
                  <button type="button" className="ms-btn-brand lg" onClick={() => setActiveStep(2)}>
                    Next: Library & Prompts <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </section>
            )}

            {activeStep === 2 && (
              <section className="ms-card">
                <div className="ms-card-title-row">
                  <div className="ms-icon-box purple">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2>Step 2: Prompts & Captions</h2>
                    <p>Add captions so matches know the story behind each frame.</p>
                  </div>
                </div>

                {myMedia.length === 0 ? (
                  <div className="center">
                    <Film size={48} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <p>No media uploaded yet.</p>
                    <button type="button" className="ms-btn-brand" style={{ marginTop: 12 }} onClick={() => setActiveStep(1)}>
                      Go to Upload
                    </button>
                  </div>
                ) : (
                  <div className="ms-caption-list">
                    {myMedia.map((m, idx) => (
                      <div key={m.id} className="ms-caption-row">
                        <button type="button" className="ms-caption-thumb" onClick={() => { setPreviewIndex(idx); setSelectedSlotIndex(idx) }}>
                          {m.mediaType === 'PHOTO' ? (
                            <img src={getMediaUrl(m)} alt="" />
                          ) : (
                            <video src={getMediaUrl(m)} muted />
                          )}
                          <span>{idx + 1}</span>
                        </button>
                        <div className="ms-caption-body">
                          {editingMedia?.id === m.id ? (
                            <div className="ms-caption-edit">
                              <input
                                type="text"
                                value={editingMedia.caption}
                                onChange={(e) => setEditingMedia({ ...editingMedia, caption: e.target.value })}
                                placeholder="Add a caption..."
                                autoFocus
                              />
                              <button type="button" className="ms-btn-purple" onClick={() => handleUpdateCaption(m.id, editingMedia.caption)}>
                                Save
                              </button>
                              <button type="button" className="ms-btn-outline" onClick={() => setEditingMedia(null)}>
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="ms-caption-text"
                              onClick={() => setEditingMedia({ id: m.id, caption: m.caption || '' })}
                            >
                              {m.caption || 'Click to add caption…'}
                            </button>
                          )}
                        </div>
                        <button type="button" className="ms-icon-btn" onClick={() => setEditingMedia({ id: m.id, caption: m.caption || '' })}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button" className="ms-icon-btn danger" onClick={(e) => handleDelete(m.id, e)}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="ms-footer-bar">
                  <button type="button" className="ms-btn-outline" onClick={() => setActiveStep(1)}>
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="button"
                    className="ms-btn-brand lg"
                    disabled={myMedia.length === 0}
                    onClick={() => setActiveStep(3)}
                  >
                    Next: Arrange <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </section>
            )}

            {activeStep === 3 && (
              <section className="ms-card">
                <div className="ms-card-title-row">
                  <div className="ms-icon-box purple">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  <div>
                    <h2>Step 3: Canvas Preview</h2>
                    <p>Drag to reorder. Save when your story looks right.</p>
                  </div>
                </div>

                {myMedia.length === 0 ? (
                  <div className="center"><p>No media to arrange. Upload something first!</p></div>
                ) : (
                  <div className="ms-canvas-list">
                    {myMedia.map((m, idx) => (
                      <div
                        key={m.id}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnd={handleDragEnd}
                        className={`ms-canvas-row ${draggedIndex === idx ? 'dragging' : ''}`}
                      >
                        <GripVertical className="ms-grip" />
                        <div className="ms-canvas-thumb">
                          {m.mediaType === 'PHOTO' ? (
                            <img src={getMediaUrl(m)} alt="" />
                          ) : (
                            <video src={getMediaUrl(m)} muted />
                          )}
                        </div>
                        <span className="ms-canvas-idx">#{idx + 1}</span>
                        <div className="ms-canvas-meta">
                          <p>{m.caption || 'No caption'}</p>
                          <div className="ms-canvas-controls">
                            <label>
                              Slot
                              <select
                                value={m.mediaCategory || DEFAULT_CATEGORY}
                                onChange={(e) => updateMediaField(m.id, 'mediaCategory', e.target.value)}
                              >
                                {MEDIA_CATEGORIES.map((cat) => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </label>
                            {PRIVACY_OPTIONS.map((privacy) => (
                              <label key={privacy} className="ms-radio">
                                <input
                                  type="radio"
                                  name={`privacy-${m.id}`}
                                  checked={(m.privacyMode || DEFAULT_PRIVACY) === privacy}
                                  onChange={() => updateMediaField(m.id, 'privacyMode', privacy)}
                                />
                                {privacy}
                              </label>
                            ))}
                            {m.mediaType === 'PHOTO' && (
                              <label className="ms-radio">
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
                        <button type="button" className="ms-icon-btn danger" onClick={(e) => handleDelete(m.id, e)}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="ms-footer-bar">
                  <div className="ms-footer-left">
                    <button type="button" className="ms-btn-outline" onClick={() => setActiveStep(2)}>
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <button type="button" className="ms-btn-outline" onClick={() => fileInputRef.current?.click()}>
                      <Plus className="w-4 h-4" /> Add More
                    </button>
                  </div>
                  <button
                    type="button"
                    className="ms-btn-brand lg"
                    disabled={myMedia.length === 0}
                    onClick={() => handleSaveCanvas(true)}
                  >
                    <Save className="w-4 h-4" /> Save Media Canvas
                  </button>
                </div>
              </section>
            )}

            {!user?.verified && (
              <div className="ms-verify-banner">
                <div className="ms-verify-banner-left">
                  <div className="ms-icon-box green">
                    <CheckCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="ms-verify-title">Get 3x More Likes with Verification</div>
                    <div className="ms-verify-sub">Verified profiles get priority placement in the discovery stack.</div>
                  </div>
                </div>
                <button type="button" className="ms-btn-green" onClick={() => setShowVerify(true)}>
                  Verify Selfie
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: Phone preview */}
          <aside className="ms-preview">
            <div className="ms-preview-head">
              <h3>
                <Smartphone className="w-4 h-4 text-purple-600" />
                Live Match Feed Card Preview
              </h3>
              <span className="ms-live">
                <span className="ms-live-dot" /> Live Sync
              </span>
            </div>

            <div className="ms-phone">
              <div className="ms-phone-notch" />
              <div className="ms-phone-screen">
                {activePreview ? (
                  activePreview.mediaType === 'PHOTO' ? (
                    <img src={getMediaUrl(activePreview)} alt="" className="ms-phone-bg" />
                  ) : (
                    <video src={getMediaUrl(activePreview)} className="ms-phone-bg" muted autoPlay loop playsInline />
                  )
                ) : (
                  <div className="ms-phone-empty">
                    <Camera className="w-10 h-10" />
                    <span>Upload media to preview</span>
                  </div>
                )}

                <div className="ms-phone-top-grad" />
                <div className="ms-story-bars">
                  {(previewMedia.length ? previewMedia : [null]).map((m, idx) => (
                    <div
                      key={m?.id || `bar-${idx}`}
                      className={`ms-story-bar ${previewMedia.length && idx === previewIndex ? 'on' : ''}`}
                    />
                  ))}
                </div>

                {previewMedia.length > 0 && (
                  <>
                    <button type="button" className="ms-tap left" aria-label="Previous" onClick={prevPreview} />
                    <button type="button" className="ms-tap right" aria-label="Next" onClick={nextPreview} />
                  </>
                )}

                {activePreview?.caption && (
                  <div className="ms-sticker">
                    <span>📍</span>
                    <span>{activePreview.caption}</span>
                  </div>
                )}

                <div className="ms-phone-info">
                  <div className="ms-phone-bottom-grad" />
                  <div className="ms-phone-name">
                    <h4>
                      {displayName}{displayAge != null ? `, ${displayAge}` : ''}
                    </h4>
                    {user?.verified && (
                      <span className="ms-check"><Check className="w-3.5 h-3.5" /></span>
                    )}
                  </div>
                  <div className="ms-phone-meta">
                    {previewProfile.location && <span>{previewProfile.location}</span>}
                    {previewProfile.occupation && (
                      <>
                        {previewProfile.location && <span>•</span>}
                        <span className="occ">{previewProfile.occupation}</span>
                      </>
                    )}
                  </div>
                  {previewProfile.aboutMe && (
                    <p className="ms-phone-bio">&ldquo;{previewProfile.aboutMe}&rdquo;</p>
                  )}
                </div>
              </div>

              <div className="ms-phone-actions">
                <span className="ghost"><X className="w-5 h-5" /></span>
                <span className="heart"><Heart className="w-6 h-6" fill="currentColor" /></span>
                <span className="ghost spark"><Star className="w-5 h-5" fill="currentColor" /></span>
              </div>
            </div>

            <p className="ms-preview-hint">Tap left or right on preview image to simulate story switching.</p>

            <div className="ms-preview-save">
              <button type="button" className="ms-btn-outline" onClick={() => setShowCancelModal(true)}>Cancel</button>
              <button
                type="button"
                className="ms-btn-brand"
                disabled={myMedia.length === 0}
                onClick={() => handleSaveCanvas(true)}
              >
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          </aside>
        </div>

        <MediaModal
          activeMedia={activeMedia}
          mediaList={myMedia}
          onClose={() => setActiveMedia(null)}
          onNavigate={setActiveMedia}
        />
      </div>

    <SiteFooter />
    </>
  )
}
