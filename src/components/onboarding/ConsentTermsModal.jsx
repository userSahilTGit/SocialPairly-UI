import { useEffect, useRef } from 'react'

/**
 * Background screening terms modal.
 * Escape / Cancel closes without accepting; Agree calls onAgree.
 */
export default function ConsentTermsModal({
  open,
  documentVersion,
  busy = false,
  onAgree,
  onCancel,
}) {
  const agreeRef = useRef(null)
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    agreeRef.current?.focus()

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel?.()
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel?.()
      }}
    >
      <div
        className="modal consent-terms-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-terms-title"
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="consent-terms-title">Background Screening Terms</h2>
        <p className="ob-hint">Document version: {documentVersion || '—'}</p>
        <div className="consent-terms-body">
          <p>
            By agreeing, you authorize Socialpairly and its authorized screening partners to collect,
            use, and verify the identity and background information you provide during onboarding,
            including government-issued identification, Social Security Number (where applicable),
            contact details, address history, and other disclosures on this form.
          </p>
          <p>
            Screening may include identity verification, age confirmation, and background checks
            permitted by applicable law. Results may be used to protect the safety of members and
            to determine eligibility for certain features.
          </p>
          <p>
            Sensitive documents and identifiers are stored privately, accessible only to you and
            authorized Socialpairly staff. They are never shown on public or match profiles.
          </p>
          <p>
            You may contact support to request information about how your data is processed.
            Continuing without agreement means you cannot save Identity &amp; Background information.
          </p>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn auth-primary-btn"
            ref={agreeRef}
            onClick={onAgree}
            disabled={busy}
          >
            {busy ? 'Saving…' : 'I agree'}
          </button>
        </div>
      </div>
    </div>
  )
}
