import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
export default function Login({ onLoginSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/api/admin/login', { password })
      if (await onLoginSuccess()) {
        navigate('/')
      } else {
        setError('Login succeeded, but the session could not be verified')
      }
    } catch {
      setError('Invalid password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow w-80">
        <h1 className="text-xl font-bold mb-4">Admin Login</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          className="border p-2 w-full mb-3 rounded"
        />
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button type="submit" disabled={submitting} className="bg-blue-600 text-white w-full p-2 rounded disabled:opacity-60">
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </div>
  )
}