import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function Navbar() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [deleteIdentifier, setDeleteIdentifier] = useState('')
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
        setDeleteIdentifier('')
        setDeletePassword('')
        setDeleteError('')
        setDeleteModalOpen(true)
    }

    const closeDeleteModal = () => {
        setDeleteModalOpen(false)
        setDeleteIdentifier('')
        setDeletePassword('')
        setDeleteError('')
    }

    const handleDeleteAccount = async () => {
        setDeleteError('')
        setDeleteLoading(true)
        try {
            await api.delete('/users/me', {
                data: { identifier: deleteIdentifier, password: deletePassword },
            })
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
                <NavLink to="/" className="brand">SocialPairly</NavLink>
                <div className="nav-links">
                    <NavLink to="/">Home</NavLink>
                    <NavLink to="/notifications">Notification</NavLink>
                    <NavLink to="/subscriptions">Subscription</NavLink>
                    {user?.role === 'ADMIN' && (
                        <>
                            <NavLink to="/admin">Dashboard</NavLink>
                            <NavLink to="/admin/questions">Questions</NavLink>
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
                                {user?.firstName?.[0]?.toUpperCase() || '?'}
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
                                <button type="button" className="dropdown-danger" onClick={openDeleteModal}>
                                    Delete Account
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {deleteModalOpen && (
                <div className="modal-overlay" onClick={closeDeleteModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Delete Account</h2>
                        <p style={{ color: '#6b7280', marginBottom: 16, fontSize: 14 }}>
                            This action is permanent. Enter your credentials to confirm.
                        </p>
                        {deleteError && <div className="error">{deleteError}</div>}
                        <div className="form-group">
                            <label>Email or Phone number</label>
                            <input
                                type="text"
                                value={deleteIdentifier}
                                onChange={(e) => setDeleteIdentifier(e.target.value)}
                                placeholder="you@example.com or 9876543210"
                            />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input
                                type="password"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn btn-danger" disabled={deleteLoading} onClick={handleDeleteAccount}>
                                {deleteLoading ? 'Deleting...' : 'Are you Sure'}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={closeDeleteModal}>
                                Go Back
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}