import { ShieldCheck, Lock, Heart, Gift } from 'lucide-react'
import { BrandMark, AuthCoupleScene } from './AuthBrandAssets'

const TRUST = [
  { icon: ShieldCheck, label: 'Verified Members' },
  { icon: Lock, label: 'Private & Secure' },
  { icon: Heart, label: 'Meaningful Events' },
  { icon: Gift, label: 'Safety First' },
]

/**
 * Left branding column for the full-bleed dating-app auth shell.
 * Background gradient lives on `.auth-shell` so it covers the whole page.
 */
export default function AuthHeroPanel() {
  return (
    <section className="auth-hero-panel">
      <div className="auth-brand auth-brand-stack">
        <BrandMark size={78} />
        <strong className="auth-brand-name">Socialpairly</strong>
        <p className="auth-brand-tagline">
          Meet genuinely.<br />Connect meaningfully.
        </p>
      </div>

      <ul className="auth-feature-list">
        {TRUST.map(({ icon: Icon, label }) => (
          <li key={label}>
            <span className="auth-feature-icon"><Icon size={18} strokeWidth={2} /></span>
            <span>{label}</span>
          </li>
        ))}
      </ul>

      <AuthCoupleScene />
    </section>
  )
}
