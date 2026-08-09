/** Exact Socialpairly mark from uploaded brand artwork (transparent PNG). */
export function BrandMark({ size = 72, className = '' }) {
  return (
    <img
      className={`auth-brand-logo ${className}`}
      src="/brand/socialpairly-mark.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  )
}

/** Couple + hanging lightbulbs / bokeh scene for the auth hero. */
export function AuthCoupleScene({ className = '' }) {
  return (
    <div className={`auth-couple-scene ${className}`} aria-hidden="true">
      <img
        className="auth-couple-photo"
        src="/brand/auth-hero-couple.png"
        alt=""
        draggable={false}
      />
      <div className="auth-couple-wash" />
      <div className="auth-bokeh" />
      <span className="auth-float-heart ah-1" />
      <span className="auth-float-heart ah-2" />
      <span className="auth-float-heart ah-3" />
    </div>
  )
}

export function GoogleGlyph({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z" />
      <path fill="#34A853" d="M6.6 14.3l-.8.6-2.5 1.9C5 19.4 8.2 21.2 12 21.2c2.4 0 4.5-.8 6.1-2.2l-3.1-2.4c-.9.6-2 1-3 1-2.3 0-4.3-1.5-5-3.6z" />
      <path fill="#4A90E2" d="M3.3 7.2C2.5 8.7 2 10.3 2 12s.5 3.3 1.3 4.8l3.3-2.5C6.2 13.5 6 12.8 6 12s.2-1.5.6-2.3L3.3 7.2z" />
      <path fill="#FBBC05" d="M12 5.8c1.3 0 2.5.5 3.4 1.3l2.5-2.5C16.5 2.9 14.4 2 12 2 8.2 2 5 3.8 3.3 7.2l3.3 2.5C7.7 7.3 9.7 5.8 12 5.8z" />
    </svg>
  )
}

export function AppleGlyph({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.22-2 1.09-3.15-1.05.04-2.32.7-3.07 1.58-.67.77-1.26 2.02-1.1 3.21 1.16.09 2.35-.61 3.08-1.64z" />
    </svg>
  )
}
