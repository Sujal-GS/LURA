import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Hexagon, Loader2, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { HoverButton } from '../components/ui/hover-button'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Supabase automatically exchanges the token in the URL hash and sets the session.
    // We just need to check if there's an active session with type "recovery".
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setIsValidSession(true)
      } else {
        setError('This reset link is invalid or has expired. Please request a new one.')
      }
      setIsChecking(false)
    }

    // Give Supabase a moment to process the URL hash tokens
    const timer = setTimeout(checkSession, 500)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setIsLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      // Sign out and redirect to login after 2.5s
      setTimeout(async () => {
        await supabase.auth.signOut()
        navigate('/login')
      }, 2500)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black text-white flex flex-col items-center justify-center">
      {/* Ambient background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
        <motion.div
          animate={{ x: [0, 100, -100, 0], y: [0, -100, 100, 0], scale: [1, 1.2, 0.8, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-indigo-500/20 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{ x: [0, -150, 100, 0], y: [0, 150, -100, 0], scale: [1, 0.8, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-1/4 right-1/4 w-[35rem] h-[35rem] bg-rose-500/20 rounded-full blur-[100px]"
        />
      </div>

      <motion.main
        initial={{ opacity: 0, scale: 1.05, filter: 'blur(12px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-20 mx-auto w-full max-w-sm px-6 py-12"
      >
        <div className="flex flex-col items-center">
          {/* Logo */}
          <div className="mb-8 text-center flex flex-col items-center">
            <div className="mb-4 w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-neutral-800 to-black border border-neutral-800 shadow-[0_0_40px_rgba(255,255,255,0.05)]">
              <Hexagon className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              {success ? 'Password updated!' : 'Set new password'}
            </h1>
            <p className="mt-2 text-neutral-400 text-sm max-w-sm text-balance">
              {success
                ? 'You will be redirected to login shortly.'
                : 'Choose a strong new password for your account.'}
            </p>
          </div>

          {/* Card */}
          <div className="w-full">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/50 p-6 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
              <div aria-hidden className="absolute inset-0 z-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

              <div className="relative z-10">
                {isChecking ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
                  </div>
                ) : success ? (
                  <div className="flex flex-col items-center gap-4 py-4 text-center">
                    <CheckCircle2 className="w-14 h-14 text-green-400" />
                    <p className="text-sm text-neutral-400">Redirecting you to login...</p>
                  </div>
                ) : !isValidSession ? (
                  <div className="flex flex-col items-center gap-4 py-4 text-center">
                    <AlertCircle className="w-12 h-12 text-red-400" />
                    <p className="text-sm text-neutral-400">{error}</p>
                    <button
                      onClick={() => navigate('/login')}
                      className="mt-2 text-sm text-white hover:underline transition-colors"
                    >
                      Back to login
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <div className="text-red-400 text-xs text-center p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                        {error}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-neutral-300 ml-1">New Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all placeholder:text-neutral-600 pr-10"
                          placeholder="Min. 6 characters"
                          required
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-neutral-300 ml-1">Confirm Password</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all placeholder:text-neutral-600"
                        placeholder="Repeat your password"
                        required
                      />
                    </div>

                    <HoverButton
                      type="submit"
                      disabled={isLoading}
                      className="w-full mt-2 flex items-center justify-center"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Update Password
                    </HoverButton>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.main>
    </div>
  )
}
