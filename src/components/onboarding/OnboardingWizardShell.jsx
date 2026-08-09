import { Check, DoorOpen } from 'lucide-react'

const DEFAULT_STEPS = [
  { id: 'identity', label: 'Identity' },
  { id: 'personality', label: 'Personality' },
  { id: 'faith', label: 'Faith' },
  { id: 'media', label: 'Media' },
  { id: 'payment', label: 'Payment' },
]

/**
 * Pixel-aligned to SocialPairly Page 2 mockup:
 * page title → horizontal stepper → left A–H nav → single content panel.
 */
export default function OnboardingWizardShell({
  pageTitle = 'Page 2: Personality & Lifestyle',
  steps = DEFAULT_STEPS,
  currentStepId = 'personality',
  sections = [],
  activeSectionId,
  onSectionChange,
  onSaveExit,
  onSaveContinue,
  saveExitLabel = 'Save & Exit',
  saveContinueLabel = 'Save & Continue',
  saving = false,
  continueDisabled = false,
  children,
}) {
  const currentIndex = Math.max(0, steps.findIndex((s) => s.id === currentStepId))

  return (
    <div className="ow-page">
      <div className="ow-frame">
        {pageTitle ? <h1 className="ow-page-title">{pageTitle}</h1> : null}

        <nav className="ow-stepper" aria-label="Registration progress">
          <div className="ow-stepper-track" aria-hidden="true" />
          <ol className="ow-stepper-list">
            {steps.map((step, i) => {
              const done = i < currentIndex
              const active = i === currentIndex
              return (
                <li
                  key={step.id}
                  className={`ow-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}
                >
                  <span className="ow-step-dot" aria-hidden="true">
                    {done ? <Check size={15} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="ow-step-label">{step.label}</span>
                </li>
              )
            })}
          </ol>
        </nav>

        <div className="ow-body">
          <aside className="ow-sidebar" aria-label="Page sections">
            <ul className="ow-section-list">
              {sections.map((section) => {
                const active = section.id === activeSectionId
                const label = `${section.code}. ${section.title}`
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      className={`ow-section-btn ${active ? 'active' : ''}`}
                      aria-current={active ? 'step' : undefined}
                      onClick={() => onSectionChange?.(section.id)}
                    >
                      {label}
                    </button>
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              className="ow-save-exit"
              onClick={onSaveExit}
              disabled={saving}
            >
              <DoorOpen size={18} strokeWidth={2} />
              {saving ? 'Saving…' : saveExitLabel}
            </button>
          </aside>

          <section className="ow-content" aria-live="polite">
            <div className="ow-content-inner">{children}</div>
            <div className="ow-content-footer">
              <button
                type="button"
                className="ow-continue-btn"
                onClick={onSaveContinue}
                disabled={continueDisabled || saving}
              >
                {saving ? 'Saving…' : saveContinueLabel}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
