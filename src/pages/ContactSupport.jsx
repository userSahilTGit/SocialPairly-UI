import { useMemo, useState } from 'react'
import { CheckCircle2, LifeBuoy, Mail, Send } from 'lucide-react'
import Navbar from '../components/Navbar'
import SiteFooter from '../components/SiteFooter'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { CUSTOMER_CARE_EMAIL } from '../config/oauth'

const ISSUE_OPTIONS = [
  'Account & sign-in',
  'Billing & subscriptions',
  'Matching & profile',
  'Safety & privacy',
  'Technical issue',
  'Events',
  'Other',
]

export default function ContactSupport() {
  const { user } = useAuth()

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const pageUrl = useMemo(
    () => (typeof window !== 'undefined' ? window.location.href : ''),
    [],
  )

  const toggleIssue = (label) => {
    setSelectAll(false)
    setIssues((prev) => (
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    ))
  }

  const toggleAllIssues = () => {
    if (selectAll) {
      setSelectAll(false)
      setIssues([])
    } else {
      setSelectAll(true)
      setIssues([...ISSUE_OPTIONS])
    }
  }

  const validate = () => {
    const next = {}
    if (!accountName.trim()) next.name = 'Account name is missing. Update your profile and try again.'
    if (!accountEmail.trim()) next.email = 'Account email is missing. Update your profile and try again.'
    if (!subject.trim()) next.subject = 'Subject is required'
    if (message.trim().length < 10) next.message = 'Please describe your issue (at least 10 characters)'
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!validate()) return

    setLoading(true)
    try {
      const { data } = await api.post('/support/contact', {
        name: accountName.trim(),
        email: accountEmail.trim(),
        phone: phone.trim() || null,
        issues: selectAll || issues.length === ISSUE_OPTIONS.length ? [...ISSUE_OPTIONS] : issues,
        subject: subject.trim(),
        message: message.trim(),
        pageUrl: pageUrl || null,
      })
      setSuccess(data?.message || 'Message sent to customer care.')
      setSubject('')
      setMessage('')
      setIssues([])
      setSelectAll(false)
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Unable to send your message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="contact-support-page">
        <div className="contact-support-shell">
          <header className="contact-support-hero">
            <span className="contact-support-badge">
              <LifeBuoy size={16} aria-hidden />
              Customer care
            </span>
            <h1>Tell us what you need help with</h1>
          </header>

          <form className="contact-support-form" onSubmit={onSubmit} noValidate>
            {error && <div className="error" role="alert">{error}</div>}
            {success && (
              <div className="success contact-support-success" role="status">
                <CheckCircle2 size={18} aria-hidden />
                <span>{success}</span>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cc-name">Your name</label>
                <input
                  id="cc-name"
                  value={accountName}
                  readOnly
                  tabIndex={-1}
                  autoComplete="off"
                  aria-readonly="true"
                  className="contact-support-locked"
                  aria-invalid={!!fieldErrors.name}
                />
                {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="cc-email">Email</label>
                <input
                  id="cc-email"
                  type="email"
                  value={accountEmail}
                  readOnly
                  tabIndex={-1}
                  autoComplete="off"
                  aria-readonly="true"
                  className="contact-support-locked"
                  aria-invalid={!!fieldErrors.email}
                />
                {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="cc-phone">Phone (optional)</label>
              <input
                id="cc-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>

            <fieldset className="contact-support-issues">
              <legend>Issues (select any or all)</legend>
              <label className={`contact-support-chip contact-support-chip--all ${selectAll ? 'is-selected' : ''}`}>
                <input type="checkbox" checked={selectAll} onChange={toggleAllIssues} />
                <span>All issues</span>
              </label>
              <div className="contact-support-issue-grid" role="group" aria-label="Issue categories">
                {ISSUE_OPTIONS.map((label) => {
                  const selected = issues.includes(label)
                  return (
                    <label
                      key={label}
                      className={`contact-support-chip ${selected ? 'is-selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleIssue(label)}
                      />
                      <span>{label}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <div className="form-group">
              <label htmlFor="cc-subject">Subject</label>
              <input
                id="cc-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={160}
                aria-invalid={!!fieldErrors.subject}
              />
              {fieldErrors.subject && <span className="field-error">{fieldErrors.subject}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="cc-message">Message</label>
              <textarea
                id="cc-message"
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={5000}
                aria-invalid={!!fieldErrors.message}
                placeholder="Describe what happened, what you expected, and any steps we should know."
              />
              {fieldErrors.message && <span className="field-error">{fieldErrors.message}</span>}
            </div>

            <div className="contact-support-actions">
              <button className="btn auth-primary-btn" type="submit" disabled={loading}>
                <Send size={16} aria-hidden />
                <span>{loading ? 'Sending…' : 'Send to customer care'}</span>
              </button>
              <p className="contact-support-hint">
                <Mail size={14} aria-hidden />
                Prefer email? Write us at{' '}
                <a href={`mailto:${CUSTOMER_CARE_EMAIL}`}>{CUSTOMER_CARE_EMAIL}</a>
              </p>
            </div>
          </form>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
