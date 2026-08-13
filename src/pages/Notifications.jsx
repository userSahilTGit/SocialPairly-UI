import Navbar from '../components/Navbar'
import SiteFooter from '../components/SiteFooter'

export default function Notifications() {
    return (
        <>
            <Navbar />
            <main className="coming-soon-page">
                <div className="card coming-soon-card">
                    <p className="coming-soon-text">Coming soon....</p>
                </div>
            </main>
            <SiteFooter />
        </>
    )
}
