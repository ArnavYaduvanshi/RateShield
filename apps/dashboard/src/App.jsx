import { useEffect, useState, useCallback } from 'react'
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import api from './api/client'

function App() {
  const [authed, setAuthed] = useState(null)
  const [logoutError, setLogoutError] = useState('')
  const navigate = useNavigate()

  const checkAuth = useCallback(async () => {
    return api.get('/api/admin/check')
      .then(() => {
        setAuthed(true)
        return true
      })
      .catch(() => {
        setAuthed(false)
        return false
      })
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (authed === null) return <div>Loading...</div>

  const handleLogout = async () => {
    try {
      await api.post('/api/admin/logout')
      setAuthed(false)
      navigate('/login')
    } catch {
      setLogoutError('Could not log out. Please try again.')
    }
  }

  const authenticatedPage = (page) => (
    authed
      ? (
        <div className="min-h-screen">
          <header className="bg-white border-b border-gray-200">
            <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-6">
              <span className="font-semibold text-gray-900 mr-auto">RateShield</span>
              <NavLink to="/" end className={({ isActive }) => isActive ? 'text-indigo-700 font-medium' : 'text-gray-600 hover:text-indigo-700'}>
                Dashboard
              </NavLink>
              <NavLink to="/clients" className={({ isActive }) => isActive ? 'text-indigo-700 font-medium' : 'text-gray-600 hover:text-indigo-700'}>
                Clients
              </NavLink>
              <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-red-600">
                Log out
              </button>
            </nav>
          </header>
          {logoutError && (
            <p role="alert" className="max-w-6xl mx-auto px-6 pt-4 text-sm text-red-600">
              {logoutError}
            </p>
          )}
          <main className="max-w-6xl mx-auto p-6">{page}</main>
        </div>
      )
      : <Navigate to="/login" />
  )

  return (
    <Routes>
      <Route path="/login" element={!authed ? <Login onLoginSuccess={checkAuth} /> : <Navigate to="/" />} />
      <Route path="/" element={authenticatedPage(<Dashboard />)} />
      <Route path="/clients" element={authenticatedPage(<Clients />)} />
      <Route path="/clients/:apiKey" element={authenticatedPage(<ClientDetail />)} />
      <Route path="*" element={<Navigate to={authed ? '/' : '/login'} />} />
    </Routes>
  )
}
export default App