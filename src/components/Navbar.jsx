import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Crown, Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { BrandMark, LoggedInBrandName } from './AuthBrandAssets'
import ThemeToggle from './ThemeToggle'
import { DASHBOARD_KEYS, getEmployeeNavItems, isEmployeeUser } from '../utils/employeeAccess'
import { SUPPORT_INBOX_EVENT, formatUnreadBadge } from '../utils/supportInbox'
import api from '../api/axios'

export default function Navbar() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [menuOpen, setMenuOpen] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [isPremium, setIsPremium] = useState(false)
    const [supportUnread, setSupportUnread] = useState(0)
    const dropdownRef = useRef(null)

    useEffect(() => {
        if (!user || isEmployeeUser(user)) {
            setIsPremium(false)
            return undefined
        }
        let cancelled = false
        ;(async () => {
            try {
                const { data } = await api.get('/subscriptions/current')
                if (!cancelled) setIsPremium(!!(data && data.active !== false))
            } catch {
                if (!cancelled) setIsPremium(false)
            }
        })()
        return () => { cancelled = true }
    }, [user])

    const employeeNavItems = isEmployeeUser(user) ? getEmployeeNavItems(user) : []
    const hasSupportDesk = employeeNavItems.some((item) => item.key === DASHBOARD_KEYS.CUSTOMER_SUPPORT)

    useEffect(() => {
        if (!hasSupportDesk) return undefined
        let cancelled = false
        const fetchUnread = async () => {
            try {
                const { data } = await api.get('/admin/customer-support/notifications/unread-count')
                if (!cancelled) setSupportUnread(Number(data?.unreadCount) || 0)
            } catch {
                /* keep last known count */
            }
        }
        fetchUnread()
        const timer = setInterval(fetchUnread, 30000)
        window.addEventListener(SUPPORT_INBOX_EVENT, fetchUnread)
        return () => {
            cancelled = true
            clearInterval(timer)
            window.removeEventListener(SUPPORT_INBOX_EVENT, fetchUnread)
        }
    }, [hasSupportDesk])

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
                    {!isEmployeeUser(user) && (
                        <NavLink to="/">Home</NavLink>
                    )}
                    {!isEmployeeUser(user) && (
                        <NavLink to="/subscriptions">Subscription</NavLink>
                    )}
                    {isEmployeeUser(user) && employeeNavItems.map((item) => {
                        const badge = item.key === DASHBOARD_KEYS.CUSTOMER_SUPPORT
                            ? formatUnreadBadge(hasSupportDesk ? supportUnread : 0)
                            : null
                        return (
                            <NavLink
                                key={item.key}
                                to={item.path}
                                end={item.end === true}
                                className={({ isActive }) => [
                                    isActive ? 'nav-active' : '',
                                    badge ? 'nav-link-with-badge' : '',
                                ].filter(Boolean).join(' ') || undefined}
                            >
                                <span>{item.label}</span>
                                {badge && (
                                    <span
                                        key={badge}
                                        className="nav-unread-badge"
                                        aria-label={`${supportUnread} unread support notifications`}
                                    >
                                        {badge}
                                    </span>
                                )}
                            </NavLink>
                        )
                    })}

                    <div className="nav-theme-desktop">
                        <ThemeToggle />
                    </div>

                    <div className="profile-dropdown" ref={dropdownRef}>
                        <button
                            type="button"
                            className={`profile-icon-btn${isPremium ? ' is-premium' : ''}`}
                            onClick={() => setDropdownOpen((o) => !o)}
                            aria-label={isPremium ? 'Premium profile menu' : 'Profile menu'}
                        >
                            <span className="profile-icon">
                                {(user?.displayName || user?.firstName)?.[0]?.toUpperCase() || '?'}
                            </span>
                            {isPremium && (
                                <span className="profile-premium-badge" title="Premium member" aria-hidden="true">
                                    <Crown size={11} strokeWidth={2.4} />
                                </span>
                            )}
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
