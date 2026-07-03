import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate('/signin')
    }

    return (
        <nav className="navbar">
            <NavLink to="/" className="brand">Learning Project</NavLink>
            <div className="nav-links">
                <NavLink to="/" end>Home</NavLink>
                <NavLink to="/profile">Profile</NavLink>
                {user?.role === 'ADMIN' && (
                    <>
                        <NavLink to="/admin">Dashboard</NavLink>
                        <NavLink to="/admin/questions">Questions</NavLink>
                    </>
                )}
                <span style={{ color: '#6b7280', fontSize: 14 }}>
                    Hi, {user?.firstName}
                </span>
                <button className="btn btn-sm btn-secondary" onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </nav>
    )
}