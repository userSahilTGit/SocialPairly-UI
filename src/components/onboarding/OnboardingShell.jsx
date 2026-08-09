import { ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../AuthBrandAssets'

const STEPS = [
  {
    id: 'identity',
    title: 'Identity',
    full: 'Identity & Background',
    path: '/onboarding/identity',
  },
  {
    id: 'personality',
    title: 'Personality',
    full: 'Personality & Goals',
    path: '/onboarding/personality',
  },
  {
    id: 'faith',
    title: 'Faith',
    full: 'Religion & Culture',
    path: '/onboarding/faith',
  },
  {
    id: 'media',
    title: 'Media',
    full: 'Photos & Videos',
    path: '/profile/media',
  },
  {
    id: 'payment',
    title: 'Payment',
    full: 'Membership & Payment',
    path: '/subscriptions',
  },
]

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
  children,
}) {
  const navigate = useNavigate()
  const currentIndex = Math.max(0, STEPS.findIndex((s) => s.id === currentStepId))
  const progress = ((currentIndex + 1) / STEPS.length) * 100
  const current = STEPS[currentIndex]

  const goToStep = (step) => {
    if (!step?.path) return
    if (step.id === currentStepId) return
    navigate(step.path)
  }

  return (
    <div className="ob-shell">
      <aside className="ob-side">
        <div className="ob-brand">
          <BrandMark size={56} className="ob-brand-logo" />
          <strong className="ob-brand-name">Socialpairly</strong>
          <small className="ob-brand-meta">
            {editMode ? 'EDIT YOUR PROFILE' : 'CREATE YOUR PROFILE'}
          </small>
        </div>
        <div className="ob-side-copy">
          <h2>
            {editMode
              ? 'Update your identity details anytime.'
              : 'Meaningful connections begin with a thoughtful introduction.'}
          </h2>
          <p>
            {editMode
              ? 'Changes are saved privately and reflected on your profile.'
              : 'Save your progress and return at any time.'}
          </p>
        </div>
        <nav className="ob-steps" aria-label="Registration progress">
          {STEPS.map((step, i) => {
            const state = i < currentIndex ? 'Completed' : i === currentIndex ? 'In progress' : 'Not started'
            const active = i === currentIndex
            return (
              <button
                key={step.id}
                type="button"
                className={`ob-step ${active ? 'active' : ''} ${i < currentIndex ? 'done' : ''}`}
                onClick={() => goToStep(step)}
                aria-current={active ? 'step' : undefined}
              >
                <span>{i + 1}</span>
                <div>
                  <b>{step.title}</b>
                  <small>{state}</small>
                </div>
              </button>
            )
          })}
        </nav>
      </aside>

      <main className="ob-main">
        <header className="ob-main-header">
          <button type="button" className="ob-link-btn" onClick={onSaveLater} disabled={saving}>
            {saveLaterLabel}
          </button>
          <span className="ob-secure">
            <ShieldCheck size={16} /> Encrypted & private
          </span>
        </header>

        <div className="ob-progress" aria-hidden="true">
          <div style={{ width: `${progress}%` }} />
        </div>

        <section className="ob-card">
          <small>{current?.full?.toUpperCase()}</small>
          <h1>{current?.full}</h1>
          <p className="ob-desc">
            {currentStepId === 'faith'
              ? 'Your religion and the faith preferences you look for in a match. Optional and private unless you choose to share.'
              : currentStepId === 'personality'
                ? 'Personality, lifestyle, interests, and relationship goals that help others understand you.'
                : 'Legal name, preferred name, date of birth, pronouns, gender identity, and private contact details. Sensitive information stays private unless you choose to share it.'}
          </p>
          {children}
          <div className="ob-privacy">
            <ShieldCheck size={18} />
            Sensitive information remains private and is never shown unless you explicitly choose to share it.
          </div>
        </section>

        <footer className="ob-footer">
          <button type="button" className="btn ob-secondary" onClick={onBack} disabled={saving}>
            <ChevronLeft size={18} /> Back
          </button>
          <button
            type="button"
            className="btn auth-primary-btn"
            onClick={onContinue}
            disabled={continueDisabled || saving}
          >
            {saving ? 'Saving…' : continueLabel}
            {!saving && <ChevronRight size={18} />}
          </button>
        </footer>
      </main>
    </div>
  )
}
