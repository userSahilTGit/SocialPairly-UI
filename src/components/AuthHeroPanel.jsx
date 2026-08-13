import { ShieldCheck, Lock, Heart, Sparkles } from 'lucide-react'

const BENEFITS = [
  { icon: ShieldCheck, title: 'Verified', sub: 'ID Screened', tone: 'pink' },
  { icon: Lock, title: 'Private', sub: '100% Secure', tone: 'purple' },
  { icon: Heart, title: 'Meaningful', sub: 'Values First', tone: 'pink' },
  { icon: Sparkles, title: 'Safe Events', sub: '30 Participants', tone: 'amber' },
]

/**
 * Left branding column for the twilight auth shell.
 * Logo lives in the page header (original BrandMark); this is hero copy + couple card.
 */
export default function AuthHeroPanel({ onPrivacyClick }) {
  return (
    <section className="auth-hero-panel">
      <div className="auth-hero-copy-block">
        <div className="auth-intent-pill">
          <span className="auth-intent-dot" />
          <span>Verified Intentional Matchmaking</span>
        </div>

        <h1 className="auth-hero-headline">
          Where real values{' '}
          <span className="auth-hero-gradient-text">create lasting bonds.</span>
        </h1>

        <p className="auth-hero-lead">
          Connecting verified singles through private, intentional matching and curated 30-person events.
          No public profiles. No endless swiping.
        </p>

        <div className="auth-benefit-grid">
          {BENEFITS.map(({ icon: Icon, title, sub, tone }) => (
            <div key={title} className="auth-benefit-card">
              <div className={`auth-benefit-icon ${tone}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="auth-benefit-title">{title}</div>
                <div className="auth-benefit-sub">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-couple-card group">
        <img
          className="auth-couple-photo"
          src="/brand/auth-hero-couple.png"
          alt=""
          draggable={false}
        />
        <div className="auth-couple-wash" aria-hidden="true" />
        <div className="auth-couple-hearts" aria-hidden="true">
          <Heart className="ah-1" fill="currentColor" />
          <Heart className="ah-2" fill="currentColor" />
          <Heart className="ah-3" fill="currentColor" />
          <Sparkles className="ah-4" />
        </div>
        <div className="auth-couple-banner">
          <div className="auth-couple-banner-left">
            <span className="auth-live-dot" />
            <p>Your privacy is safeguarded at every step of your journey.</p>
          </div>
          {onPrivacyClick && (
            <button type="button" className="auth-couple-learn" onClick={onPrivacyClick}>
              Learn More
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
