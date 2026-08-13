import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, ShieldCheck, X } from 'lucide-react'
import { BrandMark } from './AuthBrandAssets'
import ThemeToggle from './ThemeToggle'
import AuthEnergyCanvas from './AuthEnergyCanvas'

/**
 * Shared twilight chrome for Sign In / Sign Up: header with original logo, footer, privacy modal.
 */
export default function AuthPageLayout({ children, privacyOpen, onPrivacyOpen, onPrivacyClose }) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = privacyOpen ?? internalOpen
  const openPrivacy = onPrivacyOpen || (() => setInternalOpen(true))
  const closePrivacy = onPrivacyClose || (() => setInternalOpen(false))

  return (
    <div className="auth-shell auth-shell-fullbleed">
      <div className="auth-shell-glow twilight-bokeh" aria-hidden="true" />
      <AuthEnergyCanvas />

      <header className="auth-topbar">
        <Link to="/signin" className="auth-top-brand" aria-label="Socialpairly home">
          <BrandMark size={48} className="auth-top-logo" />
          <div className="auth-top-brand-text">
            <strong>Socialpairly</strong>
            <span>Meet genuinely. Connect meaningfully.</span>
          </div>
        </Link>

        <div className="auth-topbar-actions">
          <ThemeToggle className="theme-toggle-on-dark" />
          <button type="button" className="auth-privacy-pill" onClick={openPrivacy}>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>256-Bit Encrypted & Private</span>
          </button>
        </div>
      </header>

      <div className="auth-main-grid">
        {typeof children === 'function'
          ? children({ openPrivacy })
          : children}
      </div>

      <footer className="auth-page-footer">
        <div className="auth-footer-left">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Your privacy is our highest priority</span>
        </div>
        <div className="auth-footer-links">
          <button type="button" onClick={openPrivacy}>Privacy Policy</button>
          <span>•</span>
          <a href="/terms" onClick={(e) => e.preventDefault()}>Terms of Service</a>
          <span>•</span>
          <a href="/fcra" onClick={(e) => e.preventDefault()}>FCRA Screening Notice</a>
        </div>
      </footer>

      {open && (
        <div className="auth-modal-overlay" role="presentation" onClick={closePrivacy}>
          <div
            className="auth-privacy-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="auth-modal-close" onClick={closePrivacy} aria-label="Close">
              <X className="w-5 h-5" />
            </button>
            <div className="auth-privacy-modal-head">
              <div className="auth-privacy-modal-icon">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 id="privacy-title">256-Bit Privacy Guarantee</h3>
                <p>FCRA Compliant Verification</p>
              </div>
            </div>
            <div className="auth-privacy-modal-body">
              <p>
                Socialpairly is built around strict data privacy. We never make your full name, phone number,
                work address, or legal background public to other members.
              </p>
              <p>
                All background screening checks are encrypted, processed by accredited security providers,
                and never shared with third parties.
              </p>
            </div>
            <button type="button" className="auth-privacy-modal-btn" onClick={closePrivacy}>
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
