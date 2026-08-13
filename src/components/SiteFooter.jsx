import { Link } from 'react-router-dom'
import { BrandMark } from './AuthBrandAssets'

const YEAR = new Date().getFullYear()

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <BrandMark size={36} className="site-footer-logo" />
          <div>
            <strong>Socialpairly</strong>
            <p>Meet genuinely. Connect meaningfully.</p>
          </div>
        </div>

        <div className="site-footer-cols">
          <div className="site-footer-col">
            <h4>Product</h4>
            <Link to="/">Home</Link>
            <Link to="/profile">Profile</Link>
            <Link to="/subscriptions">Subscriptions</Link>
            <Link to="/profile/media">Photos & Videos</Link>
          </div>
          <div className="site-footer-col">
            <h4>Company</h4>
            <a href="#about" onClick={(e) => e.preventDefault()}>About</a>
            <a href="#careers" onClick={(e) => e.preventDefault()}>Careers</a>
            <a href="#press" onClick={(e) => e.preventDefault()}>Press</a>
            <a href="#contact" onClick={(e) => e.preventDefault()}>Contact</a>
          </div>
          <div className="site-footer-col">
            <h4>Legal</h4>
            <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
            <a href="#terms" onClick={(e) => e.preventDefault()}>Terms of Service</a>
            <a href="#cookies" onClick={(e) => e.preventDefault()}>Cookie Policy</a>
            <a href="#fcra" onClick={(e) => e.preventDefault()}>FCRA Notice</a>
          </div>
          <div className="site-footer-col">
            <h4>Support</h4>
            <a href="#help" onClick={(e) => e.preventDefault()}>Help Center</a>
            <a href="#safety" onClick={(e) => e.preventDefault()}>Safety Tips</a>
            <a href="#community" onClick={(e) => e.preventDefault()}>Community Guidelines</a>
            <Link to="/settings">Settings</Link>
          </div>
        </div>
      </div>

      <div className="site-footer-bottom">
        <span>© {YEAR} Socialpairly. All rights reserved.</span>
        <span className="site-footer-meta">Built for intentional, private matchmaking.</span>
      </div>
    </footer>
  )
}
