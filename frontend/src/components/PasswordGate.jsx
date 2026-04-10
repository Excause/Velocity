import { useState, useEffect } from 'react'

const PASSWORD = 'FcKDW'
const STORAGE_KEY = 'velocity_auth'

export default function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(false)
  const [input, setInput]       = useState('')
  const [error, setError]       = useState(false)
  const [shake, setShake]       = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === '1') {
      setUnlocked(true)
    }
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (input === PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, '1')
      setUnlocked(true)
    } else {
      setError(true)
      setShake(true)
      setInput('')
      setTimeout(() => setShake(false), 600)
    }
  }

  if (unlocked) return children

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-4xl">⚡</span>
            <span className="text-3xl font-bold text-white tracking-tight">Velocity</span>
          </div>
          <p className="text-gray-400 text-sm">AI Stock Intelligence – Zugang erforderlich</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className={`bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl transition-all ${shake ? 'animate-shake' : ''}`}
        >
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Passwort
          </label>
          <input
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false) }}
            placeholder="••••••"
            autoFocus
            className={`w-full bg-gray-800 border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 transition-all ${
              error
                ? 'border-red-500 focus:ring-red-500/30'
                : 'border-gray-700 focus:ring-blue-500/30 focus:border-blue-500'
            }`}
          />
          {error && (
            <p className="mt-2 text-red-400 text-sm">Falsches Passwort. Bitte erneut versuchen.</p>
          )}
          <button
            type="submit"
            className="mt-5 w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Zugang erhalten
          </button>
        </form>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  )
}
