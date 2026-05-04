import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

interface FollowListModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  type: 'followers' | 'following' | 'views' | null
}

type Profile = {
  id: string
  username: string
  full_name: string
  avatar_url: string
  view_count?: number
}

export function FollowListModal({ isOpen, onClose, userId, type }: FollowListModalProps) {
  const navigate = useNavigate()
  const [users, setUsers] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && userId && type) {
      fetchUsers()
    } else {
      setUsers([])
    }
  }, [isOpen, userId, type])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      if (type === 'followers') {
        const { data, error } = await supabase
          .from('follows')
          .select('follower_id, profiles!follower_id(id, username, full_name, avatar_url)')
          .eq('following_id', userId)

        if (error) throw error
        if (data) {
          // Flatten the response
          const profiles = data.map((item: any) => item.profiles)
          setUsers(profiles)
        }
      } else if (type === 'following') {
        const { data, error } = await supabase
          .from('follows')
          .select('following_id, profiles!following_id(id, username, full_name, avatar_url)')
          .eq('follower_id', userId)

        if (error) throw error
        if (data) {
          // Flatten the response
          const profiles = data.map((item: any) => item.profiles)
          setUsers(profiles)
        }
      } else if (type === 'views') {
        const { data, error } = await supabase
          .from('profile_views')
          .select('viewer_id, profiles!viewer_id(id, username, full_name, avatar_url)')
          .eq('viewed_id', userId)
          .gt('viewed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('viewed_at', { ascending: false })

        if (error) throw error
        if (data) {
          // Aggregate views by user
          const aggregatedProfiles: Record<string, Profile> = {}
          data.forEach((item: any) => {
            const p = item.profiles
            if (!p) return
            if (!aggregatedProfiles[p.id]) {
              aggregatedProfiles[p.id] = { ...p, view_count: 1 }
            } else {
              aggregatedProfiles[p.id].view_count! += 1
            }
          })
          setUsers(Object.values(aggregatedProfiles))
        }
      }
    } catch (error) {
      console.error(`Error fetching ${type}:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto h-[70vh] backdrop-blur-2xl rounded-t-3xl z-50 flex flex-col border-t shadow-[0_-10px_40px_rgba(0,0,0,0.5)] ${type === 'views' ? 'bg-gradient-to-t from-purple-950/80 to-purple-900/60 border-purple-500/30' : 'bg-black/60 border-white/10'}`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-4 border-b ${type === 'views' ? 'border-purple-500/20' : 'border-white/5'}`}>
              <h2 className={`font-semibold text-lg capitalize ${type === 'views' ? 'text-purple-100' : 'text-white'}`}>
                {type === 'views' ? 'Profile Views' : type}
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Content list */}
            <div className="flex-1 overflow-y-auto p-4 pb-24 flex flex-col gap-4">
              {isLoading ? (
                <div className="flex justify-center p-10">
                  <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 text-neutral-500">
                  <User className="w-10 h-10 mb-4 opacity-30" />
                  <p>No {type} yet.</p>
                </div>
              ) : (
                users.map((user) => (
                  <div 
                    key={user.id} 
                    onClick={() => {
                      onClose()
                      navigate(`/profile/${user.id}`)
                    }}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <img 
                      src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}`} 
                      alt={user.username} 
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex flex-col flex-1">
                      <span className="font-semibold text-white/90">{user.username}</span>
                      <span className="text-xs text-neutral-400">{user.full_name || 'Lura User'}</span>
                    </div>
                    {type === 'views' && user.view_count && user.view_count > 1 && (
                      <div className="flex flex-col items-center justify-center bg-purple-500/10 px-3 py-1 rounded-xl border border-purple-500/20 shadow-inner">
                        <span className="text-[10px] uppercase font-bold text-purple-400/80 leading-none mb-0.5 tracking-wider">Views</span>
                        <span className="text-sm font-bold text-purple-200 leading-none">{user.view_count}</span>
                      </div>
                    )}
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
