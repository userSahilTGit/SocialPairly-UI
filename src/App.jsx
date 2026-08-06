import { Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'
import Subscriptions from './pages/Subscriptions'
import Settings from './pages/Settings'
import AdminDashboard from './pages/AdminDashboard'
import AdminQuestions from './pages/AdminQuestions'
import ProfileMediaPage from './pages/ProfileMediaPage'
import AdminMediaModeration from './pages/AdminMediaModeration'
import AdminPlans from './pages/AdminPlans'

export default function App() {
  const { loading } = useAuth()

  if (loading) {
    return <div className="center">Loading...</div>
  }

  return (
    <GoogleOAuthProvider clientId="1043168194153-i82qfvqg1jsk804qaa7ipkkov67b8pt4.apps.googleusercontent.com">
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        
        <Route path="/notifications" element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        } />
        
        <Route path="/subscriptions" element={
          <ProtectedRoute>
            <Subscriptions />
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        
        <Route path="/admin" element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/admin/questions" element={
          <ProtectedRoute adminOnly>
            <AdminQuestions />
          </ProtectedRoute>
        } />
        
        {/* Add User Media Upload Route */}
        <Route 
          path="/profile/media" 
          element={
            <ProtectedRoute>
              <ProfileMediaPage />
            </ProtectedRoute>
          } 
        />

        {/* Add Admin Media Moderation Route */}
        <Route 
          path="/admin/media" 
          element={
            <ProtectedRoute adminOnly={true}>
              <AdminMediaModeration />
            </ProtectedRoute>
          } 
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </GoogleOAuthProvider>
  )
}