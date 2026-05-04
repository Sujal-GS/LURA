import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Hexagon, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { HoverButton } from '../components/ui/hover-button'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const navigate = useNavigate()

  // Rate limiting: track failed attempts in localStorage
  const RATE_LIMIT_KEY = 'lura_login_attempts'
  const COOLDOWN_SECS = 30
  const MAX_ATTEMPTS = 5
  const [cooldownSecsLeft, setCooldownSecsLeft] = useState(0)

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '{"count":0}')
    if (stored.lockedUntil && Date.now() < stored.lockedUntil) {
      const remaining = Math.ceil((stored.lockedUntil - Date.now()) / 1000)
      setCooldownSecsLeft(remaining)
    }
  }, [])

  useEffect(() => {
    if (cooldownSecsLeft <= 0) return
    const timer = setInterval(() => {
      setCooldownSecsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownSecsLeft])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cooldownSecsLeft > 0) return
    setIsLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) {
      // Increment failure count
      const stored = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '{"count":0}')
      const newCount = (stored.count || 0) + 1
      if (newCount >= MAX_ATTEMPTS) {
        const lockedUntil = Date.now() + COOLDOWN_SECS * 1000
        localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ count: newCount, lockedUntil }))
        setCooldownSecsLeft(COOLDOWN_SECS)
        setError(`Too many failed attempts. Try again in ${COOLDOWN_SECS} seconds.`)
      } else {
        localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ count: newCount }))
        setError(`${error.message} (${MAX_ATTEMPTS - newCount} attempts left)`)
      }
      setIsLoading(false)
    } else {
      localStorage.removeItem(RATE_LIMIT_KEY)
      navigate('/')
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })
    if (error) {
      setError(error.message)
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError('Please enter your email address.'); return }
    setIsLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setIsLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setResetSent(true)
    }
  }


  const path1 = "M0 663C145.5 663 191 666.265 269 647C326.5 630 339.5 621 397.5 566C439 531.5 455 529.5 490 523C509.664 519.348 521 503.736 538 504.236C553.591 504.236 562.429 514.739 584.66 522.749C592.042 525.408 600.2 526.237 607.356 523.019C624.755 515.195 641.446 496.324 657 496.735C673.408 496.735 693.545 519.572 712.903 526.769C718.727 528.934 725.184 528.395 730.902 525.965C751.726 517.115 764.085 497.106 782 496.735C794.831 496.47 804.103 508.859 822.469 518.515C835.13 525.171 850.214 526.815 862.827 520.069C875.952 513.049 889.748 502.706 903.5 503.736C922.677 505.171 935.293 510.562 945.817 515.673C954.234 519.76 963.095 522.792 972.199 524.954C996.012 530.611 1007.42 534.118 1034 549C1077.5 573.359 1082.5 594.5 1140 629C1206 670 1328.5 662.5 1440 662.5";
  const path2 = "M0 587.5C147 587.5 277 587.5 310 573.5C348 563 392.5 543.5 408 535C434 523.5 426 526.235 479 515.235C494 512.729 523 510.435 534.5 512.735C554.5 516.735 555.5 523.235 576 523.735C592 523.735 616 496.735 633 497.235C648.671 497.235 661.31 515.052 684.774 524.942C692.004 527.989 700.2 528.738 707.349 525.505C724.886 517.575 741.932 498.33 757.5 498.742C773.864 498.742 791.711 520.623 810.403 527.654C816.218 529.841 822.661 529.246 828.451 526.991C849.246 518.893 861.599 502.112 879.5 501.742C886.47 501.597 896.865 506.047 907.429 510.911C930.879 521.707 957.139 519.639 982.951 520.063C1020.91 520.686 1037.5 530.797 1056.5 537C1102.24 556.627 1116.5 570.704 1180.5 579.235C1257.5 589.5 1279 587 1440 588";
  const path3 = "M0 514C147.5 514.333 294.5 513.735 380.5 513.735C405.976 514.94 422.849 515.228 436.37 515.123C477.503 514.803 518.631 506.605 559.508 511.197C564.04 511.706 569.162 512.524 575 513.735C588 516.433 616 521.702 627.5 519.402C647.5 515.402 659 499.235 680.5 499.235C700.5 499.235 725 529.235 742 528.735C757.654 528.735 768.77 510.583 791.793 500.59C798.991 497.465 807.16 496.777 814.423 499.745C832.335 507.064 850.418 524.648 866 524.235C882.791 524.235 902.316 509.786 921.814 505.392C926.856 504.255 932.097 504.674 937.176 505.631C966.993 511.248 970.679 514.346 989.5 514.735C1006.3 515.083 1036.5 513.235 1055.5 513.235C1114.5 513.235 1090.5 513.235 1124 513.235C1177.5 513.235 1178.99 514.402 1241 514.402C1317.5 514.402 1274.5 512.568 1440 513.235";
  const path4 = "M0 438.5C150.5 438.5 261 438.318 323.5 456.5C351 464.5 387.517 484.001 423.5 494.5C447.371 501.465 472 503.735 487 507.735C503.786 512.212 504.5 516.808 523 518.735C547 521.235 564.814 501.235 584.5 501.235C604.5 501.235 626 529.069 643 528.569C658.676 528.569 672.076 511.63 695.751 501.972C703.017 499.008 711.231 498.208 718.298 501.617C735.448 509.889 751.454 529.98 767 529.569C783.364 529.569 801.211 507.687 819.903 500.657C825.718 498.469 832.141 499.104 837.992 501.194C859.178 508.764 873.089 523.365 891 523.735C907.8 524.083 923 504.235 963 506.735C1034.5 506.735 1047.5 492.68 1071 481.5C1122.5 457 1142.23 452.871 1185 446.5C1255.5 436 1294 439 1439.5 439";
  const path5 = "M0.5 364C145.288 362.349 195 361.5 265.5 378C322 391.223 399.182 457.5 411 467.5C424.176 478.649 456.916 491.677 496.259 502.699C498.746 503.396 501.16 504.304 503.511 505.374C517.104 511.558 541.149 520.911 551.5 521.236C571.5 521.236 590 498.736 611.5 498.736C631.5 498.736 652.5 529.236 669.5 528.736C685.171 528.736 697.81 510.924 721.274 501.036C728.505 497.988 736.716 497.231 743.812 500.579C761.362 508.857 778.421 529.148 794 528.736C810.375 528.736 829.35 508.68 848.364 502.179C854.243 500.169 860.624 500.802 866.535 502.718C886.961 509.338 898.141 519.866 916 520.236C932.8 520.583 934.5 510.236 967.5 501.736C1011.5 491 1007.5 493.5 1029.5 480C1069.5 453.5 1072 440.442 1128.5 403.5C1180.5 369.5 1275 360.374 1439 364";

  return (
    <div className="min-h-screen relative overflow-hidden bg-black text-white flex flex-col items-center justify-center">
      {/* Ambient moving gradients */}
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
        <motion.div
          animate={{ x: [0, 50, -50, 0], y: [0, 100, -50, 0], scale: [1, 1.5, 0.9, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 w-[30rem] h-[30rem] bg-cyan-500/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"
        />
      </div>

      <AnimatePresence mode="wait">
        {!showForm ? (
          <motion.div
            key="gemini-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex flex-col items-center justify-center absolute inset-0 z-10"
          >
            {/* The Gemini Effect SVG Background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-80">
              <svg
                width="1440"
                height="890"
                viewBox="0 0 1440 890"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] md:w-full max-w-none"
              >
                <motion.path
                  d={path1}
                  stroke="#FFB7C5" strokeWidth="2" fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 3, ease: "easeInOut", delay: 0.2 }}
                />
                <motion.path
                  d={path2}
                  stroke="#FFDDB7" strokeWidth="2" fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 3, ease: "easeInOut", delay: 0.4 }}
                />
                <motion.path
                  d={path3}
                  stroke="#B1C5FF" strokeWidth="2" fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 3, ease: "easeInOut", delay: 0.6 }}
                />
                <motion.path
                  d={path4}
                  stroke="#4FABFF" strokeWidth="2" fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 3, ease: "easeInOut", delay: 0.8 }}
                />
                <motion.path
                  d={path5}
                  stroke="#076EFF" strokeWidth="2" fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 3, ease: "easeInOut", delay: 1 }}
                />
                
                {/* Blurs */}
                <defs>
                  <filter id="blurMe"><feGaussianBlur in="SourceGraphic" stdDeviation="5" /></filter>
                </defs>
                <motion.path d={path1} stroke="#FFB7C5" strokeWidth="2" fill="none" filter="url(#blurMe)" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.5 }} transition={{ duration: 3, ease: "easeInOut", delay: 0.2 }} />
                <motion.path d={path2} stroke="#FFDDB7" strokeWidth="2" fill="none" filter="url(#blurMe)" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.5 }} transition={{ duration: 3, ease: "easeInOut", delay: 0.4 }} />
                <motion.path d={path3} stroke="#B1C5FF" strokeWidth="2" fill="none" filter="url(#blurMe)" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.5 }} transition={{ duration: 3, ease: "easeInOut", delay: 0.6 }} />
                <motion.path d={path4} stroke="#4FABFF" strokeWidth="2" fill="none" filter="url(#blurMe)" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.5 }} transition={{ duration: 3, ease: "easeInOut", delay: 0.8 }} />
                <motion.path d={path5} stroke="#076EFF" strokeWidth="2" fill="none" filter="url(#blurMe)" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.5 }} transition={{ duration: 3, ease: "easeInOut", delay: 1 }} />
              </svg>
            </div>

            {/* Intro Content */}
            <div className="absolute bottom-[52%] left-1/2 -translate-x-1/2 z-20 flex flex-col items-center w-full pointer-events-none">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6, duration: 0.8 }}
                className="text-5xl md:text-7xl font-normal text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-100 to-neutral-400 pointer-events-auto tracking-tight"
              >
                Experience Lura
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.7, duration: 0.8 }}
                className="text-neutral-400 mt-3 text-sm tracking-widest uppercase opacity-80 pointer-events-auto"
              >
                Nothing lasts. Be real.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8, duration: 0.8 }}
                className="pointer-events-auto mt-8"
              >
                <HoverButton onClick={() => setShowForm(true)}>
                  <span className="tracking-widest uppercase text-sm">Login to Lura</span>
                </HoverButton>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.main 
            key="login-form"
            initial={{ opacity: 0, scale: 1.05, filter: 'blur(12px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-20 mx-auto w-full max-w-sm px-6 py-12"
          >
            <div className="flex flex-col items-center">
              {/* Logo & Header */}
              <div className="mb-8 text-center flex flex-col items-center">
                {forgotMode ? (
                  <>
                    <h1 className="text-3xl font-normal tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-neutral-100 to-neutral-400">Reset password</h1>
                    <p className="mt-2 text-neutral-400 text-sm max-w-sm text-balance">
                      Enter your email and we'll send you a reset link.
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="text-3xl font-normal tracking-tight text-balance bg-clip-text text-transparent bg-gradient-to-b from-neutral-100 to-neutral-400">Welcome back</h1>
                    <p className="mt-2 text-neutral-400 text-sm max-w-sm text-balance">
                      Sign into your account
                    </p>
                  </>
                )}
              </div>

              {/* Form Area */}
              <div className="w-full">
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/50 p-6 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
                  <div aria-hidden className="absolute inset-0 z-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

                  <AnimatePresence mode="wait">
                    {forgotMode ? (
                      <motion.div
                        key="forgot"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="relative z-10"
                      >
                        {resetSent ? (
                          <div className="flex flex-col items-center gap-4 py-4 text-center">
                            <CheckCircle2 className="w-12 h-12 text-green-400" />
                            <p className="font-semibold text-white">Check your inbox!</p>
                            <p className="text-sm text-neutral-400">A password reset link has been sent to <span className="text-white font-medium">{email}</span>.</p>
                            <button
                              onClick={() => { setForgotMode(false); setResetSent(false); setError('') }}
                              className="mt-2 text-sm text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" /> Back to login
                            </button>
                          </div>
                        ) : (
                          <form onSubmit={handleForgotPassword} className="space-y-4">
                            {error && (
                              <div className="text-red-400 text-xs text-center p-2 bg-red-500/10 border border-red-500/20 rounded-lg">{error}</div>
                            )}
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-neutral-300 ml-1">Email</label>
                              <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all placeholder:text-neutral-600"
                                placeholder="name@example.com"
                                required
                                autoFocus
                              />
                            </div>
                            <HoverButton type="submit" disabled={isLoading} className="w-full mt-2 flex items-center justify-center">
                              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                              Send reset link
                            </HoverButton>
                            <button
                              type="button"
                              onClick={() => { setForgotMode(false); setError('') }}
                              className="w-full text-sm text-neutral-500 hover:text-white transition-colors flex items-center justify-center gap-1.5 pt-1"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" /> Back to login
                            </button>
                          </form>
                        )}
                      </motion.div>
                    ) : (
                      <motion.form
                        key="login"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                        onSubmit={handleLogin}
                        className="relative z-10 space-y-4"
                      >
                        {error && (
                          <div className="text-red-400 text-xs text-center p-2 bg-red-500/10 border border-red-500/20 rounded-lg">{error}</div>
                        )}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-neutral-300 ml-1">Email</label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all placeholder:text-neutral-600"
                            placeholder="name@example.com"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center ml-1">
                            <label className="text-xs font-medium text-neutral-300">Password</label>
                            <button
                              type="button"
                              onClick={() => { setForgotMode(true); setError('') }}
                              className="text-xs text-neutral-500 hover:text-white transition-colors"
                            >
                              Forgot password?
                            </button>
                          </div>
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all placeholder:text-neutral-600"
                            placeholder="••••••••"
                            required
                          />
                        </div>
                        <HoverButton type="submit" disabled={isLoading} className="w-full mt-2 flex items-center justify-center">
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Continue to Lura
                        </HoverButton>
                        
                        <div className="relative my-4">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-white/10" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-[#0f0f0f] px-2 text-neutral-500">Or continue with</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleGoogleLogin}
                          disabled={isLoading}
                          className="w-full bg-white text-black hover:bg-neutral-200 transition-colors rounded-lg px-3 py-2.5 text-sm font-semibold flex items-center justify-center disabled:opacity-50"
                        >
                          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                            <path
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              fill="#4285F4"
                            />
                            <path
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              fill="#34A853"
                            />
                            <path
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              fill="#FBBC05"
                            />
                            <path
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              fill="#EA4335"
                            />
                          </svg>
                          Google
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>

                {!forgotMode && (
                  <div className="mt-4 text-center">
                    <Link to="/signup" className="text-xs text-neutral-500 hover:text-white transition-colors">
                      Don't have an account? <span className="text-white">Sign up</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  )
}
