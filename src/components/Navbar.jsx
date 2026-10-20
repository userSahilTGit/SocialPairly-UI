import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { BrandMark, LoggedInBrandName } from './AuthBrandAssets'
import ThemeToggle from './ThemeToggle'

export default function Navbar() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [menuOpen, setMenuOpen] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const dropdownRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        setMenuOpen(false)
        setDropdownOpen(false)
    }, [location.pathname])

    useEffect(() => {
        document.body.classList.toggle('nav-menu-open', menuOpen)
        return () => document.body.classList.remove('nav-menu-open')
    }, [menuOpen])

    useEffect(() => {
        const media = window.matchMedia('(min-width: 961px)')
        const closeOnDesktop = (event) => {
            if (event.matches) {
                setMenuOpen(false)
                setDropdownOpen(false)
            }
        }
        media.addEventListener('change', closeOnDesktop)
        return () => media.removeEventListener('change', closeOnDesktop)
    }, [])

    useEffect(() => {
        if (!menuOpen) return
        const onKeyDown = (event) => {
            if (event.key === 'Escape') setMenuOpen(false)
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [menuOpen])

    const handleLogout = async () => {
        setDropdownOpen(false)
        await logout()
        navigate('/signin')
    }

    return (
        <>
            {menuOpen && (
                <button
                    type="button"
                    className="nav-backdrop"
                    aria-label="Close menu"
                    onClick={() => setMenuOpen(false)}
                />
            )}
            <nav className="navbar">
                <NavLink to="/" className="brand" aria-label="Socialpairly home">
                    <BrandMark size={36} className="nav-brand-logo" />
                    <LoggedInBrandName className="nav-brand-name" />
                </NavLink>
                <div className="nav-toolbar">
                    <ThemeToggle />
                    <button
                        type="button"
                        className="nav-menu-toggle"
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={menuOpen}
                        aria-controls="primary-nav"
                        onClick={() => setMenuOpen((open) => !open)}
                    >
                        {menuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
                <div id="primary-nav" className={`nav-links ${menuOpen ? 'is-open' : ''}`}>
                    {user?.role !== 'ADMIN' && (
                        <NavLink to="/">Home</NavLink>
                    )}
                    {user?.role !== 'ADMIN' && (
                        <NavLink to="/subscriptions">Subscription</NavLink>
                    )}
                    {user?.role === 'ADMIN' && (
                        <>
                            <NavLink to="/admin" end>Dashboard</NavLink>
                            <NavLink to="/admin/questions">Questions</NavLink>
                            <NavLink to="/admin/media" className={({ isActive }) => isActive ? 'nav-active' : ''}>
                                🛡️ Moderation Center
                            </NavLink>
                            <NavLink to="/admin/identity-documents" className={({ isActive }) => isActive ? 'nav-active' : ''}>
                                Identity Docs
                            </NavLink>
                            <NavLink to="/admin/plans">Plan & Subscriptions</NavLink>
                            <NavLink to="/admin/events">Events & Groups</NavLink>
                            <NavLink to="/admin/finance">Finance</NavLink>
                        </>
                    )}

                    <div className="nav-theme-desktop">
                        <ThemeToggle />
                    </div>

                    <div className="profile-dropdown" ref={dropdownRef}>
                        <button
                            type="button"
                            className="profile-icon-btn"
                            onClick={() => setDropdownOpen((o) => !o)}
                            aria-label="Profile menu"
                        >
                            <span className="profile-icon">
                                {(user?.displayName || user?.firstName)?.[0]?.toUpperCase() || '?'}
                            </span>
                        </button>
                        {dropdownOpen && (
                            <div className="dropdown-menu">
                                <button type="button" onClick={() => { setDropdownOpen(false); navigate('/profile') }}>
                                    Profile
                                </button>
                                <button type="button" onClick={() => { setDropdownOpen(false); navigate('/settings') }}>
                                    Settings
                                </button>
                                <button type="button" onClick={handleLogout}>
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>
        </>
    )
}
