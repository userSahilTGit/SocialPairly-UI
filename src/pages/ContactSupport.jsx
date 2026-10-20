import { useMemo, useRef, useState } from 'react'
import {
  Calendar,
  CheckCircle2,
  CloudUpload,
  CreditCard,
  Headphones,
  LayoutGrid,
  Lock,
  Mail,
  MoreHorizontal,
  Phone,
  Send,
  Shield,
  Timer,
  User,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import SiteFooter from '../components/SiteFooter'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { CUSTOMER_CARE_EMAIL } from '../config/oauth'

const ISSUE_OPTIONS = [
  { label: 'Account & sign-in', icon: User },
  { label: 'Billing & subscriptions', icon: CreditCard },
  { label: 'Matching & profile', icon: Users },
  { label: 'Safety & privacy', icon: Shield },
  { label: 'Technical issue', icon: Wrench },
  { label: 'Events', icon: Calendar },
  { label: 'Other', icon: MoreHorizontal },
]

const MAX_MESSAGE = 1000
const MAX_FILES = 3
const MAX_FILE_BYTES = 10 * 1024 * 1024
const ALLOWED_FILE_TYPES = new Set(['image/png', 'image/jpeg', 'application/pdf'])

function fileAllowed(file) {
  const type = (file.type || '').toLowerCase()
  const name = (file.name || '').toLowerCase()
  if (type === 'image/jpg') return name.endsWith('.jpg') || name.endsWith('.jpeg')
  if (!ALLOWED_FILE_TYPES.has(type)) return false
  if (type === 'image/png') return name.endsWith('.png')
  if (type === 'image/jpeg') return name.endsWith('.jpg') || name.endsWith('.jpeg')
  return name.endsWith('.pdf')
}

export default function ContactSupport() {
  const { user } = useAuth()
  const fileInputRef = useRef(null)

  const accountName = useMemo(() => {
    if (!user) return ''
    const full = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ').trim()
    return full || user.email || ''
  }, [user])

  const accountEmail = user?.email || ''

  const [phone, setPhone] = useState(user?.phoneNumber || '')
  const [issues, setIssues] = useState([])
  const [selectAll, setSelectAll] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const pageUrl = useMemo(
    () => (typeof window !== 'undefined' ? window.location.href : ''),
    [],
  )

  const toggleIssue = (label) => {
    setIssues((prev) => {
      const next = prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
      setSelectAll(next.length === ISSUE_OPTIONS.length)
      return next
    })
    setFieldErrors((prev) => ({ ...prev, issues: undefined }))
  }

  const toggleAllIssues = () => {
    if (selectAll) {
      setSelectAll(false)
      setIssues([])
    } else {
      setSelectAll(true)
      setIssues(ISSUE_OPTIONS.map((option) => option.label))
    }
    setFieldErrors((prev) => ({ ...prev, issues: undefined }))
  }

  const addFiles = (incoming) => {
    const next = [...files]
    const rejected = []
    for (const file of Array.from(incoming || [])) {
      if (next.length >= MAX_FILES) {
        rejected.push('You can attach up to 3 files.')
        break
      }
      if (!fileAllowed(file)) {
        rejected.push(`${file.name || 'A file'} must be a PNG, JPG, or PDF.`)
        continue
      }
      if (file.size > MAX_FILE_BYTES) {
        rejected.push(`${file.name} is larger than 10MB.`)
        continue
      }
      const duplicate = next.some((existing) => existing.name === file.name && existing.size === file.size)
      if (!duplicate) next.push(file)
    }
    setFiles(next)
    setFieldErrors((prev) => ({
      ...prev,
      attachments: rejected[0],
    }))
  }

  const validate = () => {
    const next = {}
    if (!accountName.trim()) next.name = 'Account name is missing. Update your profile and try again.'
    if (!accountEmail.trim()) next.email = 'Account email is missing. Update your profile and try again.'
    if (!selectAll && issues.length === 0) next.issues = 'Select at least one issue'
    if (!subject.trim()) next.subject = 'Subject is required'
    if (message.trim().length < 10) next.message = 'Please describe your issue (at least 10 characters)'
    if (message.length > MAX_MESSAGE) next.message = `Message must be ${MAX_MESSAGE} characters or fewer`
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!validate()) return

    const payload = {
      name: accountName.trim(),
      email: accountEmail.trim(),
      phone: phone.trim() || null,
      issues: selectAll || issues.length === ISSUE_OPTIONS.length ? ISSUE_OPTIONS.map((option) => option.label) : issues,
      subject: subject.trim(),
      message: message.trim(),
      pageUrl: pageUrl || null,
    }

    setLoading(true)
    try {
      let data
      if (files.length > 0) {
        const body = new FormData()
        body.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
        files.forEach((file) => body.append('attachments', file))
        ;({ data } = await api.post('/support/contact', body))
      } else {
        ;({ data } = await api.post('/support/contact', payload))
      }
      setSuccess(data?.message || 'Message sent to customer care.')
      setSubject('')
      setMessage('')
      setIssues([])
      setSelectAll(false)
      setFiles([])
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Unable to send your message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="cc-page">
        <div className="cc-shell">
          <header className="cc-hero">
            <span className="cc-badge">
              <Headphones size={15} aria-hidden />
              Customer Care
            </span>
            <h1>Tell us what you need help with</h1>
            <p>
              Have an issue or need assistance with your account? Submit your
              details and our team will get right on it.
            </p>
          </header>

          <form className="cc-card" onSubmit={onSubmit} noValidate>
            {error && <div className="error" role="alert">{error}</div>}
            {success && (
              <div className="success cc-success" role="status">
                <CheckCircle2 size={18} aria-hidden />
                <span>{success}</span>
              </div>
            )}

            <div className="cc-grid-2">
              <div className="cc-field">
                <label htmlFor="cc-name">
                  Your name <span className="cc-req" aria-hidden="true">*</span>
                </label>
                <div className="cc-control">
                  <User size={16} aria-hidden />
                  <input
                    id="cc-name"
                    value={accountName}
                    readOnly
                    tabIndex={-1}
                    autoComplete="off"
                    aria-readonly="true"
                    className="cc-locked"
                    aria-invalid={!!fieldErrors.name}
                  />
                </div>
                {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
              </div>
              <div className="cc-field">
                <label htmlFor="cc-email">
                  Email <span className="cc-req" aria-hidden="true">*</span>
                </label>
                <div className="cc-control">
                  <Mail size={16} aria-hidden />
                  <input
                    id="cc-email"
                    type="email"
                    value={accountEmail}
                    readOnly
                    tabIndex={-1}
                    autoComplete="off"
                    aria-readonly="true"
                    className="cc-locked"
                    aria-invalid={!!fieldErrors.email}
                  />
                </div>
                {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
              </div>
            </div>

            <div className="cc-field">
              <label htmlFor="cc-phone">
                Phone <span className="cc-optional">(optional)</span>
              </label>
              <div className="cc-control">
                <Phone size={16} aria-hidden />
                <input
                  id="cc-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  placeholder="+91-8973927367"
                />
              </div>
            </div>

            <fieldset className="cc-issues">
              <legend className="cc-issues-head">
                <span>
                  Issues <span className="cc-optional">(select any or all)</span>
                </span>
                <span className="cc-required-pill">At least 1 required</span>
              </legend>
              <div className="cc-issue-grid" role="group" aria-label="Issue categories">
                <label className={`cc-chip ${selectAll ? 'is-selected' : ''}`}>
                  <input type="checkbox" checked={selectAll} onChange={toggleAllIssues} />
                  <LayoutGrid size={15} aria-hidden />
                  <span>All issues</span>
                </label>
                {ISSUE_OPTIONS.map(({ label, icon: Icon }) => {
                  const selected = issues.includes(label)
                  return (
                    <label key={label} className={`cc-chip ${selected ? 'is-selected' : ''}`}>
                      <input type="checkbox" checked={selected} onChange={() => toggleIssue(label)} />
                      <Icon size={15} aria-hidden />
                      <span>{label}</span>
                    </label>
                  )
                })}
              </div>
              {fieldErrors.issues && <span className="field-error">{fieldErrors.issues}</span>}
            </fieldset>

            <div className="cc-field">
              <label htmlFor="cc-subject">
                Subject <span className="cc-req" aria-hidden="true">*</span>
              </label>
              <input
                id="cc-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={160}
                placeholder="Brief summary of the issue..."
                aria-invalid={!!fieldErrors.subject}
              />
              {fieldErrors.subject && <span className="field-error">{fieldErrors.subject}</span>}
            </div>

            <div className="cc-field">
              <div className="cc-label-row">
                <label htmlFor="cc-message">
                  Message <span className="cc-req" aria-hidden="true">*</span>
                </label>
                <span className="cc-counter">{message.length} / {MAX_MESSAGE}</span>
              </div>
              <textarea
                id="cc-message"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={MAX_MESSAGE}
                aria-invalid={!!fieldErrors.message}
                placeholder="Describe what happened, what you expected, and any steps we should know..."
              />
              {fieldErrors.message && <span className="field-error">{fieldErrors.message}</span>}
            </div>

            <div className="cc-field">
              <label htmlFor="cc-files">
                Attachments <span className="cc-optional">(optional)</span>
              </label>
              <div
                className={`cc-dropzone ${dragOver ? 'is-dragover' : ''}`}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setDragOver(false)
                  addFiles(event.dataTransfer.files)
                }}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    fileInputRef.current?.click()
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <CloudUpload size={28} aria-hidden />
                <strong>Click or drag files to upload screenshot</strong>
                <span>Supports PNG, JPG or PDF up to 10MB</span>
                <input
                  id="cc-files"
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,.png,.jpg,.jpeg,application/pdf,.pdf"
                  multiple
                  onChange={(event) => {
                    addFiles(event.target.files)
                    event.target.value = ''
                  }}
                  onClick={(event) => event.stopPropagation()}
                />
              </div>
              {fieldErrors.attachments && <span className="field-error">{fieldErrors.attachments}</span>}
              {files.length > 0 && (
                <ul className="cc-file-list">
                  {files.map((file) => (
                    <li key={`${file.name}-${file.size}`}>
                      <span>{file.name}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        onClick={() => setFiles((prev) => prev.filter((item) => item !== file))}
                      >
                        <X size={14} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="cc-actions">
              <button className="btn auth-primary-btn" type="submit" disabled={loading}>
                <Send size={16} aria-hidden />
                <span>{loading ? 'Sending…' : 'Send to customer care'}</span>
              </button>
              <p className="cc-hint">
                <Mail size={14} aria-hidden />
                Prefer email? Write us at{' '}
                <a href={`mailto:${CUSTOMER_CARE_EMAIL}`}>{CUSTOMER_CARE_EMAIL}</a>
              </p>
            </div>
          </form>

          <section className="cc-assurances" aria-label="Support promises">
            <article className="cc-assurance">
              <span className="cc-assurance-icon cc-assurance-icon--help" aria-hidden>
                <Zap size={22} />
              </span>
              <h2>Instant Help</h2>
              <p>Explore our Knowledge Base for quick answers</p>
            </article>
            <article className="cc-assurance">
              <span className="cc-assurance-icon cc-assurance-icon--time" aria-hidden>
                <Timer size={22} />
              </span>
              <h2>Fast Response</h2>
              <p>Average turnaround time is under 2 hours</p>
            </article>
            <article className="cc-assurance">
              <span className="cc-assurance-icon cc-assurance-icon--safe" aria-hidden>
                <Lock size={22} />
              </span>
              <h2>Safe &amp; Encrypted</h2>
              <p>Your personal information is always protected</p>
            </article>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
