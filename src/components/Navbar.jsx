import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { BrandMark } from './AuthBrandAssets'

export default function Navbar() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [deletePassword, setDeletePassword] = useState('')
    const [deleteError, setDeleteError] = useState('')
    const [deleteLoading, setDeleteLoading] = useState(false)
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

    const handleLogout = () => {
        setDropdownOpen(false)
        logout()
        navigate('/signin')
    }

    const openDeleteModal = () => {
        setDropdownOpen(false)
        setDeletePassword('')
        setDeleteError('')
        setDeleteModalOpen(true)
    }

    const closeDeleteModal = () => {
        setDeleteModalOpen(false)
        setDeletePassword('')
        setDeleteError('')
    }

    const handleDeleteAccount = async () => {
        if (!deletePassword.trim()) {
            setDeleteError('Password is required')
            return
        }

        setDeleteError('')
        setDeleteLoading(true)
        try {
            await api.delete('/users/me', {
                data: { password: deletePassword },
            })
            closeDeleteModal()
            logout()
            navigate('/signin')
        } catch (err) {
            setDeleteError(err.response?.data?.message || 'Failed to delete account')
        } finally {
            setDeleteLoading(false)
        }
    }

    return (
        <>
            <nav className="navbar">
                <NavLink to="/" className="brand">
                    <BrandMark size={36} className="nav-brand-logo" />
                    <span className="nav-brand-name">Socialpairly</span>
                </NavLink>
                <div className="nav-links">
                    {user?.role !== 'ADMIN' && (
                        <NavLink to="/">Home</NavLink>
                    )}
                    <NavLink to="/notifications">Notification</NavLink>
                    {user?.role !== 'ADMIN' && (
                        <NavLink to="/subscriptions">Subscription</NavLink>
                    )}
                    {user?.role !== 'ADMIN' && (
                        <NavLink to="/profile/media" className={({ isActive }) => isActive ? 'nav-active' : ''}>
                            📸 Photos & Videos
                        </NavLink>
                    )}
                    {user?.role === 'ADMIN' && (
                        <>
                            <NavLink to="/admin" end>Dashboard</NavLink>
                            <NavLink to="/admin/questions">Questions</NavLink>
                            <NavLink to="/admin/media" className={({ isActive }) => isActive ? 'nav-active' : ''}>
                                🛡️ Moderation Center
                            </NavLink>
                            <NavLink to="/admin/plans">Plan & Subscriptions</NavLink>
                            <NavLink to="/admin/events">Events & Groups</NavLink>
                            <NavLink to="/admin/finance">Finance</NavLink>
                        </>
                    )}

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
                                <button type="button" onClick={() => { setDropdownOpen(false); navigate('/onboarding/identity') }}>
                                    Identity & Background
                                </button>
                                <button type="button" onClick={() => { setDropdownOpen(false); navigate('/settings') }}>
                                    Settings
                                </button>
                                <button type="button" onClick={handleLogout}>
                                    Logout
                                </button>
                                <button
                                    type="button"
                                    className="dropdown-danger"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        openDeleteModal()
                                    }}
                                >
                                    Delete Account
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {deleteModalOpen && createPortal(
                <div className="plan-modal-overlay" onClick={!deleteLoading ? closeDeleteModal : undefined}>
                    <div className="delete-confirm-card delete-confirm-card-form" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-icon-circle">
                            <span className="warning-symbol">⚠️</span>
                        </div>
                        <h2 className="delete-title">Delete Account?</h2>
                        <p className="delete-description">
                            This action is permanent and cannot be undone. Enter your password to confirm account deletion.
                        </p>
                        {deleteError && <div className="delete-modal-error">{deleteError}</div>}
                        <div className="delete-form-field">
                            <label htmlFor="delete-account-password">Password</label>
                            <input
                                id="delete-account-password"
                                type="password"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !deleteLoading) {
                                        handleDeleteAccount()
                                    }
                                }}
                                placeholder="Enter your password"
                                autoFocus
                                disabled={deleteLoading}
                            />
                        </div>
                        <div className="delete-buttons-row">
                            <button
                                type="button"
                                className="btn-delete-cancel"
                                onClick={closeDeleteModal}
                                disabled={deleteLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-delete-confirm"
                                disabled={deleteLoading}
                                onClick={handleDeleteAccount}
                            >
                                {deleteLoading ? 'DELETING...' : 'YES, DELETE'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
