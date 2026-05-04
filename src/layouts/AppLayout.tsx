import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { DockMorph } from '../components/ui/dock-morph'
import { Hexagon, Home, Search, PlusSquare, User, Activity, MessageCircle, Crown } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CreatePostModal } from '../components/CreatePostModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import { FeedbackPill } from '../components/FeedbackPill'

export default function AppLayout() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDockVisible, setIsDockVisible] = useState(true)
  const [hasNewNotification, setHasNewNotification] = useState(false)
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)
  const [activeToast, setActiveToast] = useState<{ username: string, message: string } | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()
  const [isPremiumUser, setIsPremiumUser] = useState(false)

  // Fetch unseen notifications count
  useEffect(() => {
    if (!session?.user?.id) return

    const fetchNotifications = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('last_checked_activity')
          .eq('id', session.user.id)
          .single()

        const lastChecked = profile?.last_checked_activity || new Date(0).toISOString()

        const { count: followsCount } = await supabase.from('follows').select('*', { count: 'exact', head: true })
          .eq('following_id', session.user.id).gt('created_at', lastChecked)
        
        if (followsCount && followsCount > 0) return setHasNewNotification(true)

        // For simplicity, just check follows in the initial load to avoid complex joins.
        // The realtime subscriptions will catch live likes/comments while the app is open.
      } catch (err) {
        console.error(err)
      }
    }

    fetchNotifications()

    // Subscribe to new activity in real-time
    const followsChannel = supabase
      .channel('new-follows')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'follows', filter: `following_id=eq.${session.user.id}` }, () => setHasNewNotification(true))
      .subscribe()

    const commentsChannel = supabase
      .channel('new-comments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, async (payload: any) => {
        // Check if the comment is on user's post
        const { data } = await supabase.from('posts').select('user_id').eq('id', payload.new.post_id).single()
        if (data?.user_id === session.user.id && payload.new.user_id !== session.user.id) setHasNewNotification(true)
      })
      .subscribe()

    return () => { 
      supabase.removeChannel(followsChannel)
      supabase.removeChannel(commentsChannel)
    }
  }, [session?.user?.id])

  // Fetch premium status
  useEffect(() => {
    if (!session?.user?.id) return
    supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) setIsPremiumUser(data.is_premium || false)
      })
  }, [session?.user?.id])

  // Clear dot when user visits Activity
  useEffect(() => {
    if (location.pathname === '/activity') {
      setHasNewNotification(false)
    }
  }, [location.pathname])

  useEffect(() => {
    async function checkUnread() {
      if (!session?.user?.id) return
      const { count } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .not('last_message_sender_id', 'eq', session.user.id)
        .eq('is_read', false)
        .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
      
      setHasUnreadMessages(!!count && count > 0)
    }

    checkUnread()

    const channel = supabase
      .channel('unread-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, (payload: any) => {
        checkUnread()
        
        // Show toast for new incoming messages
        if (payload.eventType === 'UPDATE') {
          const conv = payload.new
          if (conv.last_message_sender_id !== session?.user?.id && !conv.is_read) {
            // Only show toast if we're not currently in that chat
            if (!location.pathname.includes(conv.id)) {
              // Fetch username for toast
              supabase.from('profiles').select('username').eq('id', conv.last_message_sender_id).single()
                .then(({ data }) => {
                  if (data) {
                    setActiveToast({ username: data.username, message: conv.last_message })
                    setTimeout(() => setActiveToast(null), 3000)
                  }
                })
            }
          }
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session?.user?.id])

  const dockItems = [
    { icon: Home, label: "Home", isActive: location.pathname === "/", onClick: () => navigate("/") },
    { icon: Search, label: "Explore", isActive: location.pathname === "/explore", onClick: () => navigate("/explore") },
    { icon: PlusSquare, label: "Create", onClick: () => { setIsCreateOpen(true); setIsDockVisible(false); } },
    { icon: Activity, label: "Activity", isActive: location.pathname === "/activity", hasNotification: hasNewNotification && location.pathname !== '/activity', onClick: () => navigate("/activity") },
    { icon: User, label: "Profile", isActive: location.pathname === "/profile", onClick: () => navigate("/profile") },
  ]

  return (
    <div className="h-[100dvh] w-full bg-black text-white relative flex justify-center overflow-hidden">
      {/* Ambient background for the whole app */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-0 left-1/2 w-[800px] h-[400px] bg-white/5 rounded-[100%] blur-[120px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[150px] -translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Message Notification Toast */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-4 right-4 z-[100] max-w-sm mx-auto"
          >
            <div 
              onClick={() => { navigate('/messages'); setActiveToast(null); }}
              className="bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl flex items-center gap-3 cursor-pointer active:scale-95 transition-transform"
            >
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-blue-400">New Message</p>
                <p className="text-sm font-semibold text-white truncate">@{activeToast.username}</p>
                <p className="text-sm text-neutral-400 truncate">{activeToast.message}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main 
        className="relative z-10 w-full max-w-md h-full bg-black flex flex-col overflow-y-auto overflow-x-hidden" 
        style={{ paddingBottom: isDockVisible ? 'calc(88px + env(safe-area-inset-bottom))' : '0px' }}
      >
        {/* Top Header - Hide if we are in ANY message route or if dock is hidden */}
        {isDockVisible && !location.pathname.startsWith('/messages') && (
          <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-xl border-b border-white/5 relative">
            {/* Left: Lura+ */}
            <div className="w-[80px] flex items-center">
              {!isPremiumUser ? (
                <button
                  onClick={() => navigate('/premium')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/8 border border-white/15 hover:bg-white/15 transition-colors"
                >
                  <Crown className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-xs font-bold text-white">+</span>
                </button>
              ) : (
                <button
                  onClick={() => navigate('/premium')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/20 hover:bg-yellow-400/20 transition-colors"
                >
                  <Crown className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-xs font-bold text-yellow-400">+</span>
                </button>
              )}
            </div>

            {/* Center: Lura wordmark */}
            <div className="absolute left-1/2 -translate-x-1/2">
              <h1 className="text-sm font-semibold tracking-widest uppercase">Lura</h1>
            </div>

            {/* Right: Messages & Feedback */}
            <div className="w-[80px] flex items-center justify-end gap-1">
              <FeedbackPill variant="header" />
              <button onClick={() => navigate('/messages')} className="p-1.5 hover:bg-white/10 rounded-full transition-colors relative text-white">
                <MessageCircle className="w-6 h-6" />
                {hasUnreadMessages && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-white border-2 border-black rounded-full" />
                )}
              </button>
            </div>
          </header>
        )}
        
        {/* Main Content Area */}
        <Outlet context={{ setIsDockVisible }} />
      </main>

      <AnimatePresence>
        {isDockVisible && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="pointer-events-auto">
              <DockMorph position="bottom" items={dockItems} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <CreatePostModal 
        isOpen={isCreateOpen} 
        onClose={() => {
          setIsCreateOpen(false)
          setIsDockVisible(true)
        }} 
        onSuccess={() => {
          setIsCreateOpen(false)
          setIsDockVisible(true)
          navigate("/")
        }} 
      />
    </div>
  )
}
