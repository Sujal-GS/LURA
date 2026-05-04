import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Zap, Crown, ArrowLeft, Loader2, Star, Eye, Repeat, Clock, Lock, Sparkles, Ghost } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import { useNavigate } from 'react-router-dom'

declare global {
  interface Window {
    Razorpay: any
  }
}

const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: 199,
    priceDisplay: '₹199',
    period: '/month',
    description: 'Billed monthly',
    razorpayAmount: 19900, // in paise
  },
  {
    id: 'yearly',
    label: 'Yearly',
    price: 1499,
    priceDisplay: '₹1,499',
    period: '/year',
    description: 'Save ₹889 annually',
    badge: 'Best Value',
    razorpayAmount: 149900,
  },
]

const PERKS = [
  {
    icon: Eye,
    title: 'Profile Insights',
    description: 'See exactly who viewed your profile and posts in real-time.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20'
  },
  {
    icon: Repeat,
    title: 'Extra Replays',
    description: 'Get unlimited replays for disappearing messages and content.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20'
  },
  {
    icon: Clock,
    title: 'Extended Expiry',
    description: 'Keep your stories alive for 72 hours instead of just 24.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20'
  },
  {
    icon: Lock,
    title: 'Private Vault',
    description: 'Permanently save disappearing content in a passcode-locked vault.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20'
  },
  {
    icon: Sparkles,
    title: 'AI Intelligence',
    description: 'Smart automated captions, quick replies, and chat assistance.',
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10 border-fuchsia-500/20'
  },
  {
    icon: Ghost,
    title: 'Ghost Mode',
    description: 'Browse profiles and stories completely anonymously.',
    color: 'text-neutral-300',
    bg: 'bg-white/10 border-white/20'
  }
]

export default function Premium() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [isPremium, setIsPremium] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [successModal, setSuccessModal] = useState(false)
  const [betaModal, setBetaModal] = useState(false)

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
    return () => { document.body.removeChild(script) }
  }, [])

  useEffect(() => {
    const fetchStatus = async () => {
      if (!session) return
      const { data } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', session.user.id)
        .single()
      if (data) setIsPremium(data.is_premium || false)
      setIsLoading(false)
    }
    fetchStatus()
  }, [session])

  const handleSubscribe = async () => {
    if (!session) return
    
    setBetaModal(true)
    
    // Temporarily disabled until beta testing is over
    /*
    setIsProcessing(true)

    const plan = PLANS.find(p => p.id === selectedPlan)!

    const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID

    // Demo Mode: If no valid Razorpay key is provided, simulate a successful payment
    if (!keyId || keyId === 'rzp_test_placeholder' || keyId === '') {
      setTimeout(async () => {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({
              is_premium: true,
              razorpay_subscription_id: 'demo_sub_' + Math.random().toString(36).substring(7),
            })
            .eq('id', session.user.id)

          if (!error) {
            setIsPremium(true)
            setSuccessModal(true)
          }
        } catch (err) {
          console.error('Failed to update premium status:', err)
        } finally {
          setIsProcessing(false)
        }
      }, 1500)
      return
    }

    const options = {
      key: keyId,
      amount: plan.razorpayAmount,
      currency: 'INR',
      name: 'Lura+',
      description: `${plan.label} Premium Subscription`,
      image: '/lura-logo.png',
      prefill: {
        email: session.user.email,
        name: session.user.user_metadata?.username || session.user.email?.split('@')[0],
      },
      theme: {
        color: '#ffffff',
        backdrop_color: '#000000',
      },
      modal: {
        ondismiss: () => setIsProcessing(false),
      },
      handler: async (response: any) => {
        // Payment succeeded — update user's premium status
        try {
          const { error } = await supabase
            .from('profiles')
            .update({
              is_premium: true,
              razorpay_subscription_id: response.razorpay_payment_id,
            })
            .eq('id', session.user.id)

          if (!error) {
            setIsPremium(true)
            setSuccessModal(true)
          }
        } catch (err) {
          console.error('Failed to update premium status:', err)
        } finally {
          setIsProcessing(false)
        }
      },
    }

    try {
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      console.error('Razorpay failed to open:', err)
      setIsProcessing(false)
    }
    */
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-[#030303] text-white relative">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-[300px] h-[300px] bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-md mx-auto px-5 pb-32">
        {/* Header */}
        <div className="flex items-center pt-14 pb-8 gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Lura+</h1>
            <p className="text-neutral-500 text-xs">Premium Membership</p>
          </div>
        </div>

        {/* Already Premium Banner */}
        {isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-5 rounded-2xl border border-white/10 bg-white/5 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="font-semibold text-sm">You're already on Lura+</p>
              <p className="text-neutral-500 text-xs mt-0.5">Enjoy all premium features</p>
            </div>
          </motion.div>
        )}

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 text-center"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 border border-white/10 mb-5">
            <Zap className="w-9 h-9 text-white" strokeWidth={1.5} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Unlock Everything</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Access exclusive content from creators<br />you love, ad-free.
          </p>
        </motion.div>

        {/* Perks List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-10 flex flex-col gap-5"
        >
          {PERKS.map((perk, i) => (
            <div key={i} className="flex items-start gap-4 p-3 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
              <div className={`w-10 h-10 rounded-xl ${perk.bg} border flex items-center justify-center shrink-0 shadow-lg`}>
                <perk.icon className={`w-5 h-5 ${perk.color}`} strokeWidth={2} />
              </div>
              <div className="flex flex-col mt-0.5">
                <span className="font-semibold text-white tracking-wide">{perk.title}</span>
                <span className="text-sm text-neutral-400 mt-1 leading-relaxed">{perk.description}</span>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Plan Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-3 mb-8"
        >
          {PLANS.map(plan => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id as 'monthly' | 'yearly')}
              className={`relative flex items-center gap-4 w-full p-5 rounded-2xl border text-left transition-all duration-200 ${
                selectedPlan === plan.id
                  ? 'border-white/40 bg-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              {/* Selection dot */}
              <div className={`shrink-0 flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                selectedPlan === plan.id ? 'border-white bg-white' : 'border-neutral-600 bg-transparent'
              }`}>
                {selectedPlan === plan.id && (
                  <div className="w-2.5 h-2.5 rounded-full bg-black" />
                )}
              </div>

              <div className="flex-1">
                {plan.badge && (
                  <span className="absolute top-4 right-4 text-[10px] font-bold tracking-widest uppercase bg-white text-black px-2.5 py-1 rounded-full">
                    {plan.badge}
                  </span>
                )}
                <div className="flex items-baseline gap-1 mb-0.5">
                  <span className="text-2xl font-bold">{plan.priceDisplay}</span>
                  <span className="text-neutral-400 text-sm">{plan.period}</span>
                </div>
                <p className="text-neutral-500 text-xs">{plan.description}</p>
              </div>
            </button>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <button
            onClick={handleSubscribe}
            disabled={isPremium || isProcessing}
            className="w-full py-4 rounded-2xl bg-white text-black font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-2 transition-all hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
            ) : isPremium ? (
              <><Crown className="w-4 h-4" /> Already Subscribed</>
            ) : (
              <><Star className="w-4 h-4" /> Subscribe with Razorpay</>
            )}
          </button>
          <p className="text-center text-neutral-600 text-xs mt-3">
            Secure payment via Razorpay · Cancel anytime
          </p>
        </motion.div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {successModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 40 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-6"
            >
              <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-5">
                  <Crown className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Welcome to Lura+!</h3>
                <p className="text-neutral-400 text-sm mb-6">
                  You now have full access to all premium content on the platform.
                </p>
                <button
                  onClick={() => { setSuccessModal(false); navigate('/') }}
                  className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm tracking-widest uppercase hover:bg-neutral-200 transition-colors"
                >
                  Explore Now
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Beta Testing Modal */}
      <AnimatePresence>
        {betaModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 40 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-6"
            >
              <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
                {/* Glow effect */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[100px] bg-rose-500/20 blur-[50px] pointer-events-none" />
                
                <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-5 relative z-10">
                  <Ghost className="w-8 h-8 text-rose-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 relative z-10">Beta Testing Phase</h3>
                <p className="text-neutral-400 text-sm mb-6 relative z-10 leading-relaxed">
                  Lura is not accepting premium users as it is under beta testing....
                </p>
                <button
                  onClick={() => setBetaModal(false)}
                  className="w-full py-3 rounded-xl bg-white/10 text-white font-bold text-sm tracking-widest uppercase hover:bg-white/20 transition-colors relative z-10"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
