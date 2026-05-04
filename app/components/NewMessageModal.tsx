import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthProvider'

interface NewMessageModalProps {
  isOpen: boolean
  onClose: () => void
  onChatStart: (conversationId: string) => void
}

export function NewMessageModal({ isOpen, onClose, onChatStart }: NewMessageModalProps) {
  const { session } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isStartingChat, setIsStartingChat] = useState(false)

  useEffect(() => {
    if (!isOpen || !session?.user?.id) return
    
    // We should fetch people the user follows, or just search all users
    // For simplicity, let's fetch all users except current for now, 
    // or limit to followers/following. Let's fetch following.
    const fetchUsers = async () => {
      setIsLoading(true)
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', session.user.id)

      if (follows && follows.length > 0) {
        const followingIds = follows.map(f => f.following_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', followingIds)
        
        if (profiles) setUsers(profiles)
      } else {
        setUsers([])
      }
      setIsLoading(false)
    }

    fetchUsers()
  }, [isOpen, session?.user?.id])

  const handleStartChat = async (targetUser: any) => {
    if (!session?.user?.id || isStartingChat) return
    setIsStartingChat(true)

    try {
      // Check if conversation already exists
      const user1 = session.user.id < targetUser.id ? session.user.id : targetUser.id
      const user2 = session.user.id < targetUser.id ? targetUser.id : session.user.id

      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('user1_id', user1)
        .eq('user2_id', user2)
        .single()

      if (existingConv) {
        onChatStart(existingConv.id)
      } else {
        // Create new conversation
        // If we are following them, is status accepted?
        // Wait, if they follow us, it's accepted for us. 
        // Let's assume the status depends on if THEY follow US.
        const { data: theyFollowUs } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', targetUser.id)
          .eq('following_id', session.user.id)
          .single()

        const status = theyFollowUs ? 'accepted' : 'pending'

        const { data: newConv, error } = await supabase
          .from('conversations')
          .insert({
            user1_id: user1,
            user2_id: user2,
            status
          })
          .select('id')
          .single()

        if (error) throw error
        if (newConv) onChatStart(newConv.id)
      }
    } catch (err) {
      console.error('Error starting chat:', err)
    } finally {
      setIsStartingChat(false)
    }
  }

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-[85dvh] bg-black/80 backdrop-blur-3xl rounded-t-3xl z-50 flex flex-col border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
          >
            <div className="w-full flex justify-center pt-3 pb-2" onClick={onClose}>
              <div className="w-12 h-1.5 bg-white/20 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
              <h2 className="font-semibold text-lg">New Message</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-white/80 font-medium">To:</span>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Search following..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none text-white focus:outline-none placeholder:text-neutral-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pt-2" style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>
              {isLoading ? (
                <div className="flex justify-center p-10">
                  <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="text-center text-neutral-500 mt-10">No users found.</p>
              ) : (
                filteredUsers.map(user => (
                  <div 
                    key={user.id}
                    onClick={() => handleStartChat(user)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors active:bg-white/10"
                  >
                    <img 
                      src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}`} 
                      alt={user.username}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[15px] truncate text-white">{user.full_name || user.username}</p>
                      <p className="text-sm text-neutral-500 truncate">@{user.username}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
