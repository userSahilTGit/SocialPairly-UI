import { useEffect, useState, useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import MediaModal from '../components/MediaModal'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { getMediaUrl, isLegacyDiskPhoto, createBlobUrl, revokeBlobUrl } from '../utils/mediaUrl'
import { profileScoreHint, profileScoreTone } from '../utils/profileScore'
import { readCompletionPercentage } from '../utils/profileCompletion'
import PhoneVerifyPanel from '../components/PhoneVerifyPanel'
import SiteFooter from '../components/SiteFooter'
import {
  Camera, CheckCircle2, Eye, Edit3, Images, User, Briefcase, GraduationCap,
  MessageSquareQuote, Sliders, Heart, Users, MapPin, PhoneCall, Play,
  Plus, UploadCloud, Video, X, LayoutDashboard, UserCheck, Sparkles, Shield,
} from 'lucide-react'

const emptyEducation = { institution: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '' }

function calcAge(dateOfBirth) {
  if (!dateOfBirth) return null
  const dob = new Date(dateOfBirth)
  if (Number.isNaN(dob.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1
  return age
}

function strengthLabel(pct) {
  const tone = profileScoreTone(pct)
  if (tone === 'high') return pct >= 85 ? 'Excellent' : 'Good'
  if (tone === 'mid') return 'Getting there'
  return 'Needs attention'
}

export default function Profile() {
  const { user, loading: authLoading, refreshUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [profileMedia, setProfileMedia] = useState([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoBroken, setPhotoBroken] = useState(false)
  const [activeMedia, setActiveMedia] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [showPreview, setShowPreview] = useState(false)
  const [completionPct, setCompletionPct] = useState(0)
  const [savingBio, setSavingBio] = useState(false)

  const [form, setForm] = useState({
    aboutMe: '',
    occupation: '',
    lifestyle: '',
    locationCity: '',
    locationCountry: '',
    dateOfBirth: '',
    gender: '',
    religion: '',
    preferredReligion: '',
    interests: '',
  })
  const [educations, setEducations] = useState([emptyEducation])
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [identity, setIdentity] = useState(null)

  const fetchUserMedia = useCallback(async () => {
    setMediaLoading(true)
    try {
      const mediaRes = await api.get('/media/my-uploads')
      setProfileMedia((mediaRes.data || []).sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999)))
    } catch {
      setProfileMedia([])
    } finally {
      setMediaLoading(false)
    }
  }, [])

  const loadProfile = useCallback(async () => {
    try {
      const [profileRes, questionsRes, identityRes, completionRes] = await Promise.all([
        api.get('/profile'),
        api.get('/questions'),
        api.get('/onboarding/identity').catch(() => ({ data: null })),
        api.get('/profile/completion').catch(() => ({ data: null })),
      ])

      setCompletionPct(readCompletionPercentage(completionRes))

      const p = profileRes.data?.profile
      if (p) {
        setForm({
          aboutMe: p.aboutMe || '',
          occupation: p.occupation || '',
          lifestyle: p.lifestyle || '',
          locationCity: p.locationCity || '',
          locationCountry: p.locationCountry || '',
          dateOfBirth: p.dateOfBirth || identityRes.data?.dateOfBirth || '',
          gender: p.gender || identityRes.data?.gender || '',
          religion: p.religion || '',
          preferredReligion: p.preferredReligion || '',
          interests: (p.interests || []).join(', '),
        })
        setPhotoUrl(p.profilePhotoUrl || '')
        setPhotoBroken(false)
        if (p.educations?.length > 0) {
          setEducations(p.educations.map((e) => ({
            institution: e.institution || '',
            degree: e.degree || '',
            fieldOfStudy: e.fieldOfStudy || '',
            startYear: e.startYear || '',
            endYear: e.endYear || '',
          })))
        } else {
          setEducations([emptyEducation])
        }
      } else {
        setEducations([emptyEducation])
      }

      setIdentity(identityRes.data || null)
      setQuestions(questionsRes.data || [])
      const initialAnswers = {}
      ;(questionsRes.data || []).forEach((q) => {
        initialAnswers[q.id] = q.answerValue || ''
      })
      setAnswers(initialAnswers)
    } catch {
      setError('Failed to load profile data')
      // Still try to refresh completion independently so the score stays accurate
      try {
        const completionRes = await api.get('/profile/completion')
        setCompletionPct(readCompletionPercentage(completionRes))
      } catch {
        /* ignore */
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading) {
      loadProfile()
      fetchUserMedia()
    }
  }, [authLoading, location.key, loadProfile, fetchUserMedia])

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setMessage('')
    const preview = createBlobUrl(file)
    setPhotoUrl((prev) => {
      if (prev?.startsWith('blob:')) revokeBlobUrl(prev)
      return preview
    })
    setPhotoBroken(false)
    const data = new FormData()
    data.append('file', file)
    try {
      await api.post('/profile/photo', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setMessage('Photo updated')
      await Promise.all([refreshUser(), fetchUserMedia()])
    } catch (err) {
      setError(err.response?.data?.message || 'Photo upload failed')
    }
  }

  const handleEditBio = async () => {
    const next = window.prompt('Update your bio', form.aboutMe || '')
    if (next === null) return
    setSavingBio(true)
    setError('')
    try {
      await api.put('/profile', {
        aboutMe: next,
        occupation: form.occupation,
        lifestyle: form.lifestyle,
        locationCity: form.locationCity,
        locationCountry: form.locationCountry,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        religion: form.religion || null,
        preferredReligion: form.preferredReligion || null,
        interests: form.interests.split(',').map((s) => s.trim()).filter(Boolean),
        educations: educations
          .filter((ed) => ed.institution.trim())
          .map((ed) => ({
            institution: ed.institution,
            degree: ed.degree,
            fieldOfStudy: ed.fieldOfStudy,
            startYear: ed.startYear ? parseInt(ed.startYear, 10) : null,
            endYear: ed.endYear ? parseInt(ed.endYear, 10) : null,
          })),
      })
      setForm((prev) => ({ ...prev, aboutMe: next }))
      setMessage('Bio updated')
      await refreshUser()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update bio')
    } finally {
      setSavingBio(false)
    }
  }

  const displayName = identity?.preferredName || user?.preferredName || user?.displayName || user?.firstName || 'Member'
  const age = identity?.age ?? calcAge(identity?.dateOfBirth || form.dateOfBirth)
  const legalName = [identity?.namePrefix, identity?.firstName, identity?.middleName, identity?.lastName, identity?.nameSuffix]
    .filter(Boolean)
    .join(' ') || [user?.firstName, user?.lastName].filter(Boolean).join(' ')
  const locationLabel = [identity?.locationCity || form.locationCity, identity?.locationCountry || form.locationCountry]
    .filter(Boolean)
    .join(', ')
  const marital = identity?.relationship?.maritalStatus
    ? String(identity.relationship.maritalStatus).replace(/_/g, ' ')
    : null
  const interests = form.interests.split(',').map((s) => s.trim()).filter(Boolean)
  const educationLine = educations.find((ed) => ed.institution)?.institution
    ? (() => {
        const ed = educations.find((e) => e.institution)
        return [ed.degree, ed.fieldOfStudy, ed.institution].filter(Boolean).join(' · ')
      })()
    : null
  const filteredMedia = useMemo(
    () => profileMedia.filter((m) => m.status === 'APPROVED'),
    [profileMedia],
  )
  const primaryMedia = filteredMedia.find((m) => m.mediaType === 'PHOTO' && (m.isCover || m.mediaCategory === 'PRIMARY'))
    || filteredMedia.find((m) => m.mediaType === 'PHOTO')
  const usablePhotoUrl = photoUrl && !isLegacyDiskPhoto(photoUrl) ? photoUrl : ''
  const avatarSrc = !photoBroken && usablePhotoUrl
    ? getMediaUrl(usablePhotoUrl)
    : !photoBroken && primaryMedia
      ? getMediaUrl(primaryMedia)
      : null
  const answeredPrompts = questions.filter((q) => answers[q.id])
  const dash = (value) => value || 'Not added yet'
  const tabBtn = (id, Icon, label) => (
    <button
      type="button"
      id={`tab-${id}`}
      onClick={() => setActiveTab(id)}
      className={`sp-profile-tab ${activeTab === id ? 'active' : ''}`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  )

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="center">Loading...</div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="sp-profile-page">
        {message && <div className="success sp-profile-banner-msg">{message}</div>}
        {error && <div className="error sp-profile-banner-msg">{error}</div>}

        {/* Cover + identity hero */}
        <section className="sp-profile-hero">
          <div className="sp-profile-cover">
            <div className="sp-profile-cover-dots" aria-hidden="true" />
            <button
              type="button"
              className="sp-profile-cover-btn"
              onClick={() => navigate('/profile/media')}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Edit Cover</span>
            </button>
          </div>

          <div className="sp-profile-hero-body">
            <div className="sp-profile-identity">
              <div className="sp-profile-avatar-wrap">
                <label className="sp-profile-avatar-picker" title="Change photo">
                  <div className="sp-profile-avatar">
                    {avatarSrc ? (
                      <img
                        id="main-avatar"
                        key={avatarSrc}
                        src={avatarSrc}
                        alt={displayName}
                        onError={() => {
                          if (avatarSrc.startsWith('blob:') || avatarSrc.startsWith('data:')) return
                          setPhotoBroken(true)
                        }}
                      />
                    ) : (
                      <div className="sp-profile-avatar-fallback">
                        {(displayName?.[0] || 'S').toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="sp-profile-avatar-cam">
                    <Camera className="w-4 h-4" />
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>

              <div className="sp-profile-id-text">
                <div className="sp-profile-name-row">
                  <h1>
                    {displayName}
                    {age != null && <span className="sp-profile-age">, {age}</span>}
                  </h1>
                  {user?.verified && (
                    <span className="sp-pill sp-pill-ok">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                    </span>
                  )}
                </div>
                <p className="sp-profile-meta">
                  <span>{user?.email}</span>
                  {identity?.pronouns && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-slate-700">{identity.pronouns}</span>
                    </>
                  )}
                </p>
                <div className="sp-profile-chips">
                  {locationLabel && (
                    <span className="sp-chip sp-chip-purple">
                      <MapPin className="w-3 h-3" /> {locationLabel}
                    </span>
                  )}
                  {marital && (
                    <span className="sp-chip sp-chip-rose">
                      <User className="w-3 h-3" /> {marital}
                    </span>
                  )}
                  {form.occupation && (
                    <span className="sp-chip sp-chip-blue">
                      <Briefcase className="w-3 h-3" /> {form.occupation}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="sp-profile-actions">
              <button type="button" className="sp-btn-outline" onClick={() => setShowPreview(true)}>
                <Eye className="w-4 h-4 text-purple-600" />
                <span>Match Preview</span>
              </button>
              <button
                type="button"
                className="sp-btn-brand"
                onClick={() => navigate('/onboarding/identity')}
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Details</span>
              </button>
            </div>
          </div>
        </section>

        {/* Strength + phone */}
        <section className={`sp-profile-strength score-tone-${profileScoreTone(completionPct)}`}>
          <div className="sp-profile-strength-left">
            <div
              className={`sp-ring score-tone-${profileScoreTone(completionPct)}`}
              style={{ '--pct': completionPct }}
              data-score={completionPct}
            >
              <svg viewBox="0 0 36 36" className="sp-ring-svg" aria-hidden="true">
                <path
                  className="sp-ring-bg"
                  strokeWidth="3.5"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="sp-ring-fg"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${Math.max(0, Math.min(100, completionPct))}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span>{completionPct}%</span>
            </div>
            <div>
              <h3>
                Profile Strength: {strengthLabel(completionPct)}
                {completionPct >= 70 && <span className="sp-boost">+3.5x Matches</span>}
              </h3>
              <p>{profileScoreHint(completionPct)}</p>
            </div>
          </div>

          <div className="sp-profile-phone-card">
            <div className="sp-profile-phone-left">
              <div className="sp-profile-phone-icon">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div>
                <div className="label">Mobile</div>
                <div className="value">{user?.phoneNumber || identity?.primaryPhone || 'Not added'}</div>
              </div>
            </div>
            <button
              type="button"
              className="sp-link-pill"
              onClick={() => setActiveTab('contact')}
            >
              Manage
            </button>
          </div>
        </section>

        {/* Tabs */}
        <nav className="sp-profile-tabs" aria-label="Profile sections">
          {tabBtn('overview', LayoutDashboard, 'Overview & Gallery')}
          {tabBtn('identity', UserCheck, 'Identity & Background')}
          {tabBtn('lifestyle', Sparkles, 'Lifestyle & Prompts')}
          {tabBtn('contact', Shield, 'Contact & Privacy')}
        </nav>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="sp-profile-grid">
            <div className="sp-profile-main-col">
              <section className="sp-card">
                <div className="sp-card-head">
                  <div>
                    <h2><Images className="w-5 h-5 text-rose-500" /> Photos & Videos</h2>
                    <p>Use the camera on your avatar to change your profile photo. Gallery photos are extra shots.</p>
                  </div>
                  <button type="button" className="sp-soft-btn rose" onClick={() => navigate('/profile/media')}>
                    <Plus className="w-4 h-4" /> Add Media
                  </button>
                </div>

                {mediaLoading ? (
                  <p className="sp-muted">Loading media…</p>
                ) : filteredMedia.length === 0 ? (
                  <button
                    type="button"
                    className="sp-upload-slot"
                    onClick={() => navigate('/profile/media')}
                  >
                    <UploadCloud className="w-5 h-5" />
                    <span>Upload Photo</span>
                    <small>JPG, PNG or video</small>
                  </button>
                ) : (
                  <div className="sp-gallery">
                    {filteredMedia.map((m, idx) => (
                      <button
                        type="button"
                        key={m.id}
                        className={`sp-gallery-item ${idx === 0 ? 'primary' : ''}`}
                        onClick={() => setActiveMedia(m)}
                      >
                        {m.mediaType === 'PHOTO' ? (
                          <img src={getMediaUrl(m)} alt="" />
                        ) : (
                          <>
                            <video src={getMediaUrl(m)} muted />
                            <span className="sp-video-badge"><Video className="w-3 h-3" /> Video</span>
                            <span className="sp-play"><Play className="w-5 h-5" fill="currentColor" /></span>
                          </>
                        )}
                        {idx === 0 && <span className="sp-primary-badge">Primary</span>}
                      </button>
                    ))}
                    <button type="button" className="sp-upload-slot" onClick={() => navigate('/profile/media')}>
                      <UploadCloud className="w-5 h-5" />
                      <span>Upload Photo</span>
                    </button>
                  </div>
                )}
              </section>

              <section className="sp-card">
                <div className="sp-card-head">
                  <h2><User className="w-5 h-5 text-purple-600" /> About & Bio</h2>
                  <button type="button" className="sp-soft-btn purple" onClick={handleEditBio} disabled={savingBio}>
                    <Edit3 className="w-3.5 h-3.5" /> {savingBio ? 'Saving…' : 'Edit Bio'}
                  </button>
                </div>
                <div className="sp-bio-box">
                  <p>
                    {form.aboutMe
                      ? `"${form.aboutMe}"`
                      : 'Add a short bio so matches can get to know you.'}
                  </p>
                </div>
                <div className="sp-highlights">
                  <div className="sp-highlight">
                    <div className="icon blue"><Briefcase className="w-4 h-4" /></div>
                    <div>
                      <div className="label">Occupation</div>
                      <div className="value">{dash(form.occupation)}</div>
                    </div>
                  </div>
                  <div className="sp-highlight">
                    <div className="icon green"><GraduationCap className="w-4 h-4" /></div>
                    <div>
                      <div className="label">Education</div>
                      <div className="value">{dash(educationLine)}</div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="sp-card">
                <div className="sp-card-head">
                  <h2><MessageSquareQuote className="w-5 h-5 text-rose-500" /> Icebreaker Prompts</h2>
                  <button type="button" className="sp-soft-btn rose" onClick={() => navigate('/onboarding/personality')}>
                    <Plus className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
                {answeredPrompts.length === 0 ? (
                  <p className="sp-muted">No prompts answered yet.</p>
                ) : (
                  <div className="sp-prompts">
                    {answeredPrompts.slice(0, 4).map((q, i) => (
                      <div key={q.id} className={`sp-prompt ${i % 2 ? 'alt' : ''}`}>
                        <div className="q">{q.questionText}</div>
                        <div className="a">&ldquo;{answers[q.id]}&rdquo;</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <aside className="sp-profile-side-col">
              <section className="sp-card">
                <h3><Sliders className="w-4 h-4 text-purple-600" /> Quick Profile Details</h3>
                <ul className="sp-kv">
                  <li><span>Pronouns</span><strong>{dash(identity?.pronouns)}</strong></li>
                  <li><span>Gender</span><strong>{dash(identity?.gender || form.gender)}</strong></li>
                  <li><span>Age</span><strong>{age != null ? `${age} Years` : '—'}</strong></li>
                  <li><span>Religion</span><strong>{dash(form.religion)}</strong></li>
                  <li><span>Marital Status</span><strong>{dash(marital)}</strong></li>
                </ul>
              </section>

              <section className="sp-card">
                <div className="sp-card-head tight">
                  <h3><Heart className="w-4 h-4 text-rose-500" /> Interests & Passions</h3>
                  <button type="button" className="sp-text-link" onClick={() => navigate('/onboarding/personality')}>Edit</button>
                </div>
                <div className="sp-interest-wrap">
                  {interests.length === 0 ? (
                    <p className="sp-muted">No interests added yet.</p>
                  ) : interests.map((item) => (
                    <span key={item} className="sp-interest">{item}</span>
                  ))}
                </div>
              </section>

              <section className="sp-card">
                <h3><Users className="w-4 h-4 text-purple-600" /> Ideal Partner Match</h3>
                <div className="sp-pref-list">
                  <div><span>Looking For</span><strong>{dash(form.lifestyle || 'Meaningful connection')}</strong></div>
                  <div><span>Preferred Faith</span><strong>{dash(form.preferredReligion)}</strong></div>
                  <div><span>Location</span><strong>{dash(locationLabel)}</strong></div>
                </div>
              </section>
            </aside>
          </div>
        )}

        {/* IDENTITY */}
        {activeTab === 'identity' && (
          <section className="sp-card">
            <div className="sp-section-head">
              <div>
                <h2>Identity & Personal Background</h2>
                <p>Your personal details, preferred identity, and demographics.</p>
              </div>
              <button type="button" className="sp-btn-brand sm" onClick={() => navigate('/onboarding/identity')}>
                Update Identity
              </button>
            </div>
            <div className="sp-info-grid">
              <div className="sp-info-tile"><label>Legal Name</label><div>{dash(legalName)}</div></div>
              <div className="sp-info-tile"><label>Preferred Name</label><div>{dash(displayName)}</div></div>
              <div className="sp-info-tile"><label>Date of Birth</label><div>{dash(identity?.dateOfBirth || form.dateOfBirth)}{age != null ? ` (${age} yrs)` : ''}</div></div>
              <div className="sp-info-tile"><label>Gender Identity</label><div>{dash([identity?.gender || form.gender, identity?.pronouns].filter(Boolean).join(' · '))}</div></div>
              <div className="sp-info-tile"><label>Religion / Faith</label><div>{dash([form.religion, form.preferredReligion].filter(Boolean).join(' / '))}</div></div>
              <div className="sp-info-tile">
                <label>Gender Visibility</label>
                <div className="ok">
                  <Eye className="w-4 h-4" />
                  {identity?.genderShownToMatches === 'HIDDEN'
                    ? 'Hidden'
                    : identity?.genderShownToMatches === 'PUBLIC'
                      ? 'Public'
                      : 'Shown to potential matches'}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* LIFESTYLE */}
        {activeTab === 'lifestyle' && (
          <section className="sp-card">
            <div className="sp-section-head">
              <div>
                <h2>Lifestyle, Habits & Values</h2>
                <p>Help potential matches understand your daily life and aspirations.</p>
              </div>
              <button type="button" className="sp-soft-btn purple" onClick={() => navigate('/onboarding/personality')}>
                Edit Lifestyle
              </button>
            </div>
            <div className="sp-lifestyle-grid">
              <div className="sp-lifestyle-tile purple">
                <div className="label">Interests</div>
                <div className="sp-interest-wrap">
                  {interests.length ? interests.map((i) => <span key={i} className="sp-interest">{i}</span>) : <span className="sp-muted">Not added yet</span>}
                </div>
              </div>
              <div className="sp-lifestyle-tile rose">
                <div className="label">Relationship Goals</div>
                <p>{dash(marital)}{form.lifestyle ? ` · ${form.lifestyle}` : ''}</p>
              </div>
              {answeredPrompts.slice(0, 2).map((q) => (
                <div key={q.id} className="sp-lifestyle-tile">
                  <div className="label">{q.questionText}</div>
                  <p>{answers[q.id]}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CONTACT */}
        {activeTab === 'contact' && (
          <div className="space-y-6">
            <section className="sp-card">
              <div className="sp-section-head">
                <div>
                  <h2>Contact Details & Privacy Control</h2>
                  <p>Your contact info stays confidential unless you choose to share it.</p>
                </div>
              </div>
              <div className="sp-info-grid two">
                <div className="sp-info-tile"><label>Primary Email</label><div>{dash(identity?.primaryEmail || user?.email)}</div></div>
                <div className="sp-info-tile"><label>Primary Phone</label><div>{dash(identity?.primaryPhone || user?.phoneNumber)}</div></div>
                <div className="sp-info-tile"><label>Preferred Contact Method</label><div>{dash(identity?.preferredContactMethod)}</div></div>
                <div className="sp-info-tile"><label>Best Time To Contact</label><div>{dash(identity?.bestTimeToContact)}</div></div>
              </div>
            </section>
            <section className="sp-card">
              <h2 className="sp-card-title-only">Verify / change mobile number</h2>
              <PhoneVerifyPanel />
            </section>
          </div>
        )}
      </main>

      {/* Match preview modal */}
      {showPreview && (
        <div className="sp-preview-overlay" role="presentation" onClick={() => setShowPreview(false)}>
          <div className="sp-preview-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="sp-preview-close" onClick={() => setShowPreview(false)} aria-label="Close">
              <X className="w-4 h-4" />
            </button>
            <div className="sp-preview-media">
              {avatarSrc ? <img src={avatarSrc} alt="" /> : <div className="sp-preview-fallback">{(displayName?.[0] || 'S').toUpperCase()}</div>}
              <div className="sp-preview-grad" />
              <div className="sp-preview-copy">
                <h2>
                  {displayName}{age != null ? `, ${age}` : ''}
                  {user?.verified && <CheckCircle2 className="w-5 h-5 text-blue-400" />}
                </h2>
                {locationLabel && (
                  <p><MapPin className="w-3.5 h-3.5 text-rose-400" /> {locationLabel}</p>
                )}
                {form.aboutMe && <p className="bio">&ldquo;{form.aboutMe}&rdquo;</p>}
              </div>
            </div>
            <div className="sp-preview-actions">
              <span className="ghost"><X className="w-6 h-6" /></span>
              <span className="heart"><Heart className="w-7 h-7" fill="currentColor" /></span>
              <span className="ghost spark"><Sparkles className="w-6 h-6" /></span>
            </div>
          </div>
        </div>
      )}

      <MediaModal
        activeMedia={activeMedia}
        mediaList={filteredMedia}
        onClose={() => setActiveMedia(null)}
        onNavigate={setActiveMedia}
      />
      <SiteFooter />
    </>
  )
}
