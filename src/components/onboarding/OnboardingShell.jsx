import { useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Menu,
  Search,
  Shield,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../AuthBrandAssets'
import ThemeToggle from '../ThemeToggle'
import SiteFooter from '../SiteFooter'
import { profileScoreTone } from '../../utils/profileScore'

const STEPS = [
  {
    id: 'identity',
    title: 'Identity & Background',
    short: 'Identity',
    full: 'Identity & Background',
    blurb: '16 Categories',
    path: '/onboarding/identity',
  },
  {
    id: 'personality',
    title: 'Personality & Lifestyle',
    short: 'Personality',
    full: 'Personality & Lifestyle',
    blurb: 'Values, Hobbies & Traits',
    path: '/onboarding/personality',
  },
  {
    id: 'faith',
    title: 'Faith & Beliefs',
    short: 'Faith',
    full: 'Faith & Beliefs',
    blurb: 'Traditions & Philosophy',
    path: '/onboarding/faith',
  },
]

const STEP_DESCRIPTIONS = {
  identity:
    'Provide legal information, preferred naming, and private contact details. Sensitive identity fields remain 100% private and are never shown to other members.',
  personality:
    'Personality, lifestyle, interests, and relationship goals that help others understand you.',
  faith:
    'Your religion and the faith preferences you look for in a match. Optional and private unless you choose to share.',
}

export default function OnboardingShell({
  currentStepId = 'identity',
  onSaveLater,
  onBack,
  onContinue,
  continueLabel = 'Save & Continue',
  saveLaterLabel = 'Save & continue later',
  continueDisabled = false,
  saving = false,
  editMode = false,
  jumpLinks = [],
  onJump,
  onPreview,
  completionPct = null,
  searchEnabled = false,
  onSearch,
  searchQuery = '',
  searchMatchCount = null,
  expandAll,
  collapseAll,
  children,
}) {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const currentIndex = Math.max(0, STEPS.findIndex((s) => s.id === currentStepId))
  const current = STEPS[currentIndex]
  const pct = completionPct != null ? Math.round(completionPct) : Math.round(((currentIndex + 1) / STEPS.length) * 100)
  const scoreTone = profileScoreTone(pct)

  const goToStep = (step) => {
    if (!step?.path) return
    setSidebarOpen(false)
    if (step.id === currentStepId) return
    navigate(step.path)
  }

  const scrollToSection = (id) => {
    onJump?.(id)
    window.setTimeout(() => {
      const el = document.getElementById(`ob-sec-${id}`) || document.getElementById(`ob-section-${id}`)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
    setSidebarOpen(false)
  }

  return (
    <>
    <div className="ob-shell">
      <header className="ob-topbar">
        <div className="ob-topbar-left">
          <button
            type="button"
            className="ob-menu-btn"
            aria-label="Open navigation"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="ob-top-brand">
            <BrandMark size={36} className="ob-top-logo" />
            <div>
              <span className="ob-top-name">Socialpairly</span>
              <span className="ob-mode-pill">{editMode ? 'Edit Profile' : 'Create Profile'}</span>
            </div>
          </div>
        </div>

        <div className="ob-topbar-right">
          <ThemeToggle className="ob-theme-toggle" />
          <div className="ob-secure-pill">
            <ShieldCheck className="w-4 h-4" />
            <span>256-Bit Encrypted & Private</span>
          </div>
          {onPreview && (
            <button type="button" className="ob-preview-btn" onClick={onPreview} aria-haspopup="dialog">
              <Eye className="w-4 h-4" aria-hidden="true" />
              <span>Public Preview</span>
            </button>
          )}
          <button type="button" className="ob-cancel-link" onClick={onSaveLater} disabled={saving} aria-busy={saving || undefined}>
            {saveLaterLabel}
          </button>
          <button
            type="button"
            className="ob-save-btn"
            onClick={onContinue}
            disabled={continueDisabled || saving}
            aria-busy={saving || undefined}
          >
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            <span>{saving ? 'Saving…' : 'Save Changes'}</span>
          </button>
        </div>
      </header>

      {sidebarOpen && (
        <button
          type="button"
          className="ob-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="ob-body">
        <aside className={`ob-side ${sidebarOpen ? 'open' : ''}`}>
          <div className="ob-side-scroll">
            <div className={`ob-score-card score-tone-${scoreTone}`}>
              <div className="ob-score-head">
                <span>Profile Score</span>
                <strong className={`score-badge score-tone-${scoreTone}`}>{pct}% Complete</strong>
              </div>
              <div className="ob-score-bar">
                <div
                  className={`score-fill score-tone-${scoreTone}`}
                  style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                />
              </div>
              <p>Complete legal & background information to increase match reliability by +40%.</p>
            </div>

            <nav className="ob-steps" aria-label="Registration progress">
              <div className="ob-side-label">Navigation Steps</div>
              {STEPS.map((step, i) => {
                const active = i === currentIndex
                const done = i < currentIndex
                const state = done ? 'Completed' : active ? 'In Progress' : 'Not started'
                return (
                  <button
                    key={step.id}
                    type="button"
                    className={`ob-step ${active ? 'active' : ''} ${done ? 'done' : ''}`}
                    onClick={() => goToStep(step)}
                    aria-current={active ? 'step' : undefined}
                  >
                    <div className="ob-step-left">
                      <span className="ob-step-num">{i + 1}</span>
                      <div>
                        <b>{step.title}</b>
                        <small>{active ? `${step.blurb} • ${state}` : step.blurb}</small>
                      </div>
                    </div>
                    {active ? (
                      <ChevronRight className="w-4 h-4 ob-step-chevron" />
                    ) : (
                      <span className="ob-step-status">{state}</span>
                    )}
                  </button>
                )
              })}
            </nav>

            {jumpLinks.length > 0 && (
              <>
                <hr className="ob-side-hr" />
                <div className="ob-jump">
                  <div className="ob-side-label">Jump to Section</div>
                  {jumpLinks.map((link) => (
                    <button
                      key={link.id}
                      type="button"
                      className="ob-jump-btn"
                      onClick={() => scrollToSection(link.id)}
                    >
                      <span>{link.label}</span>
                      {link.icon === 'lock' ? (
                        <ShieldCheck className="w-3 h-3 text-emerald-300" />
                      ) : link.icon === 'badge' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-pink-200" />
                      ) : (
                        <span className={`ob-jump-dot ${link.status || 'muted'}`} />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="ob-side-foot">
            <span>Socialpairly Security v2.4</span>
            <Shield className="w-4 h-4" />
          </div>
        </aside>

        <main className="ob-main">
          <div className="ob-main-inner">
            <div className="ob-banner">
              <div className="ob-banner-bar" />
              <div className="ob-banner-row">
                <div>
                  <div className="ob-banner-meta">
                    <span>Step {String(currentIndex + 1).padStart(2, '0')} of 03</span>
                    <span className="dot">•</span>
                    <span>{current?.full}</span>
                  </div>
                  <h1>{current?.full}</h1>
                  <p>{STEP_DESCRIPTIONS[currentStepId] || STEP_DESCRIPTIONS.identity}</p>
                </div>
                {(expandAll || collapseAll) && (
                  <div className="ob-banner-actions">
                    {expandAll && (
                      <button type="button" className="ob-chip-btn" onClick={expandAll}>
                        Expand All
                      </button>
                    )}
                    {collapseAll && (
                      <button type="button" className="ob-chip-btn" onClick={collapseAll}>
                        Collapse
                      </button>
                    )}
                  </div>
                )}
              </div>

              {searchEnabled && (
                <div className="ob-search-row">
                  <div className="ob-search">
                    <Search className="w-4 h-4" aria-hidden="true" />
                    <label className="sr-only" htmlFor="ob-section-search">Search identity sections</label>
                    <input
                      id="ob-section-search"
                      type="search"
                      value={searchQuery}
                      onChange={(e) => onSearch?.(e.target.value)}
                      placeholder="Search sections (e.g. Legal Name, Languages, Verification, Career)..."
                      aria-describedby={searchQuery.trim() && searchMatchCount != null ? 'ob-search-count' : undefined}
                    />
                  </div>
                  {searchQuery.trim() && searchMatchCount != null && (
                    <span id="ob-search-count" className="ob-search-count" role="status" aria-live="polite">
                      {searchMatchCount} matching section(s)
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="ob-workspace">
              {children}
              <div className="ob-privacy">
                <ShieldCheck size={18} />
                Sensitive information remains private and is never shown unless you explicitly choose to share it.
              </div>
            </div>

            <footer className="ob-footer" aria-label="Identity form actions">
              <button type="button" className="ob-back-btn" onClick={onBack} disabled={saving}>
                <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Back
              </button>
              <button
                type="button"
                className="ob-continue-btn"
                onClick={onContinue}
                disabled={continueDisabled || saving}
                aria-busy={saving || undefined}
              >
                <span>{saving ? 'Saving…' : continueLabel}</span>
                {!saving && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
              </button>
            </footer>
          </div>
        </main>
      </div>

      {sidebarOpen && (
        <button type="button" className="ob-close-mobile" onClick={() => setSidebarOpen(false)} aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
    <SiteFooter />
    </>
  )
}
