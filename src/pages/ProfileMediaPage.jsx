import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import SiteFooter from '../components/SiteFooter'
import VideoPromptModal from '../components/VideoPromptModal'
import MediaModal from '../components/MediaModal'
import { getMediaUrl } from '../utils/mediaUrl'
import { logClientError } from '../utils/safeLog'
import {
  UploadCloud, Film, Image as ImageIcon, X, GripVertical,
  ChevronLeft, ChevronRight, Play, Pencil, Trash2, Save,
  AlertCircle, Plus, CheckCircle2, Camera, LogOut, Video,
  Star, Smartphone, ArrowRight,
  LayoutGrid, Heart,
} from 'lucide-react'

const MAX_MEDIA_SLOTS = 6
const MAX_VIDEO_DURATION_SEC = 45
const MAX_VIDEO_SIZE_BYTES = 5 * 1024 * 1024
const MEDIA_CATEGORIES = ['FULL_LENGTH', 'PRIMARY', 'LIFESTYLE', 'HOBBY']
const DEFAULT_CATEGORY = 'FULL_LENGTH'
const PRIVACY_OPTIONS = ['PUBLIC', 'MUTUAL_ONLY']
const DEFAULT_PRIVACY = 'PUBLIC'
const SUCCESS_TOAST_MS = 5000

/** SHA-256 hex matching the backend `contentHash`; null where Web Crypto is unavailable (non-secure origin). */
async function hashFile(file) {
  if (!window.crypto?.subtle) return null
  const digest = await window.crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

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
  const [successToast, setSuccessToast] = useState({ text: '', id: 0 })
  const success = successToast.text
  /** Each call gets a fresh id so a repeat message replaces the old one and replays the slide-in. */
  const setSuccess = useCallback((text) => {
    setSuccessToast(text ? { text, id: Date.now() } : { text: '', id: 0 })
  }, [])

  useEffect(() => {
    if (!successToast.id) return undefined
    const timer = setTimeout(() => setSuccessToast({ text: '', id: 0 }), SUCCESS_TOAST_MS)
    return () => clearTimeout(timer)
  }, [successToast.id])
  const [activeStep, setActiveStep] = useState(1)
  const [editingMedia, setEditingMedia] = useState(null)
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [activeMedia, setActiveMedia] = useState(null)
  const fileInputRef = useRef(null)
  const dragItemRef = useRef(null)
  const [pendingVideoFile, setPendingVideoFile] = useState(null)
  const [showPromptSelect, setShowPromptSelect] = useState(false)
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [previewProfile, setPreviewProfile] = useState({
    aboutMe: '',
    occupation: '',
    location: '',
    preferredName: '',
    age: null,
  })
  const [dragOverDropzone, setDragOverDropzone] = useState(false)
  const [cardAnim, setCardAnim] = useState('')
  const [previewEffect, setPreviewEffect] = useState('')
  const [previewConfirm, setPreviewConfirm] = useState(null)
  const [duplicateNotice, setDuplicateNotice] = useState(null)
  const previewTimersRef = useRef([])

  const clearPreviewTimers = () => {
    previewTimersRef.current.forEach(clearTimeout)
    previewTimersRef.current = []
  }

  const schedulePreview = (fn, ms) => {
    previewTimersRef.current.push(setTimeout(fn, ms))
  }

  useEffect(() => clearPreviewTimers, [])

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
        onUploadProgress: (event) => {
          if (!event.total) return
          setUploadProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)))
        },
      })
      setUploadProgress(100)
      return true
    } catch (err) {
      const message = err.response?.data?.message || `Failed to upload ${file.name}`
      if (/already in your media library/i.test(message)) {
        setDuplicateNotice({ names: [file.name], message })
      } else {
        setError(message)
      }
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

    setError('')
    setSuccess('')

    const existingHashes = new Set(myMedia.map((m) => m.contentHash).filter(Boolean))
    const seenHashes = new Set()
    const unique = []
    const skipped = []
    for (const file of files) {
      const hash = await hashFile(file).catch(() => null)
      if (hash && (existingHashes.has(hash) || seenHashes.has(hash))) {
        skipped.push(file.name)
        continue
      }
      if (hash) seenHashes.add(hash)
      unique.push(file)
    }

    if (skipped.length > 0) {
      setDuplicateNotice({
        names: skipped,
        message:
          unique.length === 0
            ? 'These files are already in your media library, so nothing was uploaded.'
            : 'These files are already in your media library and were skipped. The rest will upload.',
      })
    }
    if (unique.length === 0) return

    const toUpload = unique.slice(0, remaining)
    if (unique.length > remaining) {
      setError(`Only ${remaining} slot(s) left — extra files were not uploaded.`)
    }

    const images = []
    const videos = []
    toUpload.forEach((file) => {
      if (file.type.startsWith('video/')) videos.push(file)
      else if (file.type.startsWith('image/')) images.push(file)
    })

    if (videos.length > 0) {
      const videoFile = videos[0]
      if (videoFile.type && videoFile.type !== 'video/mp4') {
        setError('Please upload MP4 video only so it plays correctly after upload.')
        return
      }
      if (videoFile.size > MAX_VIDEO_SIZE_BYTES) {
        setError(`Video "${videoFile.name}" exceeds the 5MB limit.`)
        return
      }
      try {
        const duration = await getVideoDuration(videoFile)
        if (duration > MAX_VIDEO_DURATION_SEC) {
          setError(`Video "${videoFile.name}" is ${Math.round(duration)}s — maximum is ${MAX_VIDEO_DURATION_SEC}s.`)
          return
        }
      } catch (durationErr) {
        setError(durationErr.message)
        return
      }
      setPendingVideoFile(videoFile)
      setShowPromptSelect(true)
      return
    }

    if (images.length === 0) return

    let uploaded = 0
    setUploading(true)
    setUploadProgress(0)
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
    setUploadProgress(0)
    const uploaded = await doUpload(file)
    setUploading(false)
    setUploadProgress(0)
    if (uploaded) {
      setSuccess('Video uploaded successfully!')
      await fetchMyMedia()
    }
  }

  const canDeleteMedia = (target) => {
    const photoCount = myMedia.filter((m) => m.mediaType === 'PHOTO').length
    if (myMedia.length <= 1) {
      setError('Keep at least one media item on your profile. Upload another photo before deleting this one.')
      return false
    }
    if (target?.mediaType === 'PHOTO' && photoCount <= 1) {
      setError('Keep at least one photo as your primary profile image. Add another photo before deleting this one.')
      return false
    }
    return true
  }

  const handleDelete = (mediaId, e) => {
    e?.stopPropagation?.()
    e?.preventDefault?.()
    const target = myMedia.find((m) => m.id === mediaId)
    if (!target || !canDeleteMedia(target)) return
    setPreviewConfirm({ type: 'delete', item: target })
  }

  const performDelete = async (mediaId) => {
    try {
      await api.delete(`/media/${mediaId}`)
      setError('')
      setSuccess('Media removed successfully.')
      setActiveMedia((prev) => (prev?.id === mediaId ? null : prev))
      await fetchMyMedia()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete media. Try again or refresh the page.')
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

  const openMediaPreview = (item, e) => {
    e?.stopPropagation?.()
    if (!item) return
    setActiveMedia(item)
  }
  const openMediaModal = openMediaPreview

  const nextPreview = () => {
    if (myMedia.length === 0) return
    setPreviewIndex((i) => (i + 1) % myMedia.length)
  }

  const prevPreview = () => {
    if (myMedia.length === 0) return
    setPreviewIndex((i) => (i - 1 + myMedia.length) % myMedia.length)
  }

  const triggerPreviewAction = (type) => {
    const item = activePreview
    if (!item || cardAnim || previewEffect) return
    if (type === 'pass' && !canDeleteMedia(item)) return
    clearPreviewTimers()
    setError('')
    setSuccess('')

    const exitClass =
      type === 'pass' ? 'exit-left' : type === 'like' ? 'exit-right' : 'exit-up'
    setPreviewEffect(type)

    schedulePreview(() => {
      setPreviewEffect('')
      setCardAnim(exitClass)
      schedulePreview(() => {
        if (type === 'like') nextPreview()
        setCardAnim('card-pop-in')
        schedulePreview(() => {
          setCardAnim('')
          if (type === 'pass') {
            setPreviewConfirm({ type: 'delete', item })
          } else if (type === 'super') {
            if (item.mediaType === 'PHOTO') {
              setPreviewConfirm({ type: 'cover', item })
            } else {
              setError('Only photos can be set as your profile photo. Pick a photo and tap the star.')
            }
          }
        }, 380)
      }, 420)
    }, 600)
  }

  const makeProfilePhoto = async (item) => {
    const index = myMedia.findIndex((m) => m.id === item.id)
    if (index < 0 || myMedia[index].mediaType !== 'PHOTO') return
    if (myMedia[index].isCover && index === 0) {
      setSuccess('This is already your profile photo.')
      return
    }
    const reordered = [...myMedia]
    const [moved] = reordered.splice(index, 1)
    reordered.unshift(moved)
    const updated = reordered.map((m, i) => ({
      ...m,
      isCover: m.mediaType === 'PHOTO' ? i === 0 : false,
    }))
    setMyMedia(updated)
    setSelectedSlotIndex(0)
    setPreviewIndex(0)
    try {
      for (let i = 0; i < updated.length; i++) {
        const m = updated[i]
        await api.put(`/media/${m.id}`, {
          caption: m.caption || '',
          displayOrder: i + 1,
          mediaCategory: m.mediaCategory || DEFAULT_CATEGORY,
          privacyMode: m.privacyMode || DEFAULT_PRIVACY,
          isCover: !!m.isCover,
        })
      }
      setSuccess('Profile photo updated!')
      await fetchMyMedia()
      await refreshUser()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile photo.')
      await fetchMyMedia()
    }
  }

  const confirmPreviewAction = async () => {
    const pending = previewConfirm
    setPreviewConfirm(null)
    if (!pending) return
    if (pending.type === 'delete') await performDelete(pending.item.id)
    else if (pending.type === 'cover') await makeProfilePhoto(pending.item)
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

  const goToStep = (num) => {
    if (num === activeStep) return
    setActiveStep(num)
  }

  const stepPanelClass = (num) => {
    if (num === activeStep) return 'ms-card ms-step-panel is-active'
    if (num < activeStep) return 'ms-card ms-step-panel is-before'
    return 'ms-card ms-step-panel is-after'
  }

  const stepBtn = (num, label) => (
    <button
      type="button"
      role="tab"
      id={`step-btn-${num}`}
      aria-selected={activeStep === num}
      onClick={() => goToStep(num)}
      className={`ms-step ${activeStep === num ? 'active' : ''}`}
    >
      <span className="ms-step-num">{num}</span>
      <span className="ms-step-label">{label}</span>
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

  return (
    <>
      <Navbar />
      <div className="ms-page">
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

        {previewConfirm && (
          <div className="modal-overlay" onClick={() => setPreviewConfirm(null)}>
            <div className="modal ms-confirm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <div className="ms-confirm-thumb">
                {previewConfirm.item.mediaType === 'PHOTO' ? (
                  <img src={getMediaUrl(previewConfirm.item)} alt="" />
                ) : (
                  <video src={getMediaUrl(previewConfirm.item)} muted playsInline />
                )}
              </div>
              {previewConfirm.type === 'delete' ? (
                <>
                  <h2>{previewConfirm.item.mediaType === 'VIDEO' ? 'Delete this video?' : 'Delete this photo?'}</h2>
                  <p className="ms-confirm-desc">
                    It will be removed from your profile and media library. This cannot be undone.
                  </p>
                </>
              ) : (
                <>
                  <h2>Make this your profile photo?</h2>
                  <p className="ms-confirm-desc">
                    This photo will become your primary picture and move to the first slot.
                  </p>
                </>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setPreviewConfirm(null)}>
                  {previewConfirm.type === 'delete' ? 'Keep it' : 'Not now'}
                </button>
                <button
                  type="button"
                  className={previewConfirm.type === 'delete' ? 'btn btn-danger' : 'btn btn-primary'}
                  onClick={confirmPreviewAction}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {previewConfirm.type === 'delete' ? (
                    <><Trash2 size={16} /> Delete</>
                  ) : (
                    <><Star size={16} fill="currentColor" /> Make profile photo</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {duplicateNotice && (
          <div className="modal-overlay" onClick={() => setDuplicateNotice(null)}>
            <div className="modal ms-confirm-modal" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
              <div className="ms-dup-icon"><AlertCircle size={28} /></div>
              <h2>Duplicate upload blocked</h2>
              <p className="ms-confirm-desc">{duplicateNotice.message}</p>
              <ul className="ms-dup-list">
                {duplicateNotice.names.map((name, i) => <li key={`${name}-${i}`}>{name}</li>)}
              </ul>
              <div className="modal-actions">
                <button type="button" className="btn btn-primary" onClick={() => setDuplicateNotice(null)}>
                  Got it
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

        <div className="ms-stepper" role="tablist" aria-label="Media studio steps">
          <div
            className="ms-step-pill"
            aria-hidden
            style={{ transform: `translateX(${(activeStep - 1) * 100}%)` }}
          />
          <div className="ms-stepper-grid">
            {stepBtn(1, 'Upload & Order')}
            {stepBtn(2, 'Prompts & Captions')}
            {stepBtn(3, 'Canvas Preview')}
          </div>
        </div>

        <ProfileReadinessBanner />
        {error && <div className="error">{error}</div>}
        {success && (
          <div className="ms-toast-lane">
            <div
              key={successToast.id}
              className="success ms-success-toast"
              role="status"
              style={{ '--ms-toast-ms': `${SUCCESS_TOAST_MS}ms` }}
            >
              {success}
            </div>
          </div>
        )}

        <div className="ms-layout">
          {/* LEFT — fixed height panels so steps 1–3 never jump layout */}
          <div className="ms-main ms-panels">
            <section
              className={stepPanelClass(1)}
              aria-hidden={activeStep !== 1}
            >
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
                    accept="image/*,video/mp4"
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
                      <p>High quality JPG, PNG or MP4 videos (Max 5MB each)</p>
                      <div className="ms-drop-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="ms-btn-brand"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Plus className="w-4 h-4" /> Select Files
                        </button>
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
                              <video src={getMediaUrl(item)} muted preload="metadata" playsInline />
                              <span className="ms-video-badge"><Video className="w-3 h-3" /> Video</span>
                              <button
                                type="button"
                                className="ms-play"
                                aria-label="Play video"
                                onClick={(e) => openMediaPreview(item, e)}
                              >
                                <Play className="w-4 h-4" fill="currentColor" />
                              </button>
                            </>
                          )}
                          {idx === 0 && (
                            <span className="ms-main-badge">
                              <Star className="w-3 h-3" fill="currentColor" /> Main
                            </span>
                          )}
                          <div className="ms-slot-footer">
                            <span>{idx + 1}</span>
                            <div className="ms-slot-actions">
                              <button
                                type="button"
                                className="ms-slot-del"
                                onClick={(e) => openMediaModal(item, e)}
                                aria-label="Open full preview"
                                title="Open full preview"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                className="ms-slot-del"
                                onClick={(e) => handleDelete(item.id, e)}
                                aria-label="Delete"
                                title="Delete media"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
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
                  <button type="button" className="ms-btn-brand lg" onClick={() => goToStep(2)}>
                    Next: Library & Prompts <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </section>

            <section
              className={stepPanelClass(2)}
              aria-hidden={activeStep !== 2}
            >
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
                    <button type="button" className="ms-btn-brand" style={{ marginTop: 12 }} onClick={() => goToStep(1)}>
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
                  <button type="button" className="ms-btn-outline" onClick={() => goToStep(1)}>
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="button"
                    className="ms-btn-brand lg"
                    disabled={myMedia.length === 0}
                    onClick={() => goToStep(3)}
                  >
                    Next: Arrange <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </section>

            <section
              className={stepPanelClass(3)}
              aria-hidden={activeStep !== 3}
            >
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
                    <button type="button" className="ms-btn-outline" onClick={() => goToStep(2)}>
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
          </div>

          {/* RIGHT: Phone preview — fixed width, sticky aligned with panels */}
          <aside className="ms-preview">
            <div className="ms-preview-shell">
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
              <div
                id="activeMatchCard"
                className={`ms-phone-screen${cardAnim ? ` ${cardAnim}` : ''}`}
              >
                {activePreview ? (
                  activePreview.mediaType === 'PHOTO' ? (
                    <img src={getMediaUrl(activePreview)} alt="" className="ms-phone-bg" />
                  ) : (
                    <video
                      src={getMediaUrl(activePreview)}
                      className="ms-phone-bg"
                      muted
                      autoPlay
                      loop
                      playsInline
                      preload="metadata"
                      onClick={() => openMediaPreview(activePreview)}
                    />
                  )
                ) : (
                  <div className="ms-phone-empty">
                    <Camera className="w-10 h-10" />
                    <span>Upload media to preview</span>
                  </div>
                )}

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
                  <div className="ms-phone-name">
                    <h4>
                      {displayName}{displayAge != null ? `, ${displayAge}` : ''}
                    </h4>
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

                {/* Non-blocking gradient so story taps still work above the dock */}
                <div className="ms-phone-bottom-grad" aria-hidden="true" />

                {previewEffect && (
                  <div className={`ms-phone-effect ms-phone-effect--${previewEffect}`} aria-hidden="true">
                    {previewEffect === 'pass' && <X className="ms-effect-icon" strokeWidth={3} />}
                    {previewEffect === 'like' && (
                      <>
                        <Heart className="ms-effect-icon" fill="currentColor" />
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <Heart key={i} className={`ms-effect-particle p${i}`} fill="currentColor" />
                        ))}
                      </>
                    )}
                    {previewEffect === 'super' && (
                      <>
                        <Star className="ms-effect-icon" fill="currentColor" />
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} className={`ms-effect-particle p${i}`} fill="currentColor" />
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* Action dock above taps/overlays so ✕ ♥ ★ always receive clicks */}
                <div className="ms-phone-actions" role="group" aria-label="Preview match actions">
                  <button
                    type="button"
                    className="ghost"
                    aria-label="Delete this media"
                    title="Delete this media"
                    onClick={(e) => {
                      e.stopPropagation()
                      triggerPreviewAction('pass')
                    }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    className="heart"
                    aria-label="Like and show next"
                    title="Like and show next"
                    onClick={(e) => {
                      e.stopPropagation()
                      triggerPreviewAction('like')
                    }}
                  >
                    <Heart className="w-6 h-6" fill="currentColor" />
                  </button>
                  <button
                    type="button"
                    className="ghost spark"
                    aria-label="Make profile photo"
                    title="Make profile photo"
                    onClick={(e) => {
                      e.stopPropagation()
                      triggerPreviewAction('super')
                    }}
                  >
                    <Star className="w-5 h-5" fill="currentColor" />
                  </button>
                </div>
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
