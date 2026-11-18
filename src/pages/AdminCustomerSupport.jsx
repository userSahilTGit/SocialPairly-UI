import Navbar from '../components/Navbar'
import SiteFooter from '../components/SiteFooter'
import './AdminCustomerSupport.css'

export default function AdminCustomerSupport() {
  return (
    <>
      <Navbar />
      <div className="admin-cs-page">
        <div className="admin-cs-container">
          <header className="admin-cs-header">
            <div>
              <p className="breadcrumb-tag">Employee Console</p>
              <h1>Customer Support</h1>
              <p>Support tools for the Customer Support team will appear here.</p>
            </div>
          </header>

          <section className="admin-cs-placeholder" aria-label="Coming soon">
            <h2>Coming soon</h2>
            <p>
              This is a placeholder dashboard for Customer Support workflows.
              Existing admin features are unchanged; this tab is reserved for future support tooling.
            </p>
          </section>
        </div>
      </div>
      <SiteFooter />
    </>
  )
}
