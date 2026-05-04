import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthProvider'
import { useNavigate } from 'react-router-dom'

interface CommentsDrawerProps {
  isOpen: boolean
  onClose: () => void
  postId: string
}

type Comment = {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: {
    id: string
    username: string
    avatar_url: string
  }
}

export function CommentsDrawer({ isOpen, onClose, postId }: CommentsDrawerProps) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen && postId) {
      fetchComments()
    }
  }, [isOpen, postId])

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id, content, created_at, user_id,
        profiles (id, username, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      // Filter out comments from banned/hidden users
      const validComments = (data as any[]).filter(c => c.profiles !== null)
      setComments(validComments as Comment[])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !session) return

    setIsSubmitting(true)
    const { error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: session.user.id,
        content: newComment.trim()
      })

    if (!error) {
      setNewComment('')
      fetchComments()
    }
    setIsSubmitting(false)
  }

  const handleDelete = async (commentId: string) => {
    // Optimistic UI update
    setComments(prev => prev.filter(c => c.id !== commentId))
    
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', session?.user.id || '')
      
    if (error) {
      console.error('Error deleting comment:', error)
      fetchComments() // Revert on error
    }
  }

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
            className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-[70dvh] bg-[#0a0a0a] border-t border-white/10 rounded-t-3xl z-50 flex flex-col shadow-2xl"
          >
            {/* Handle */}
            <div className="w-full flex justify-center py-3" onClick={onClose}>
              <div className="w-12 h-1.5 bg-white/20 rounded-full" />
            </div>

            <div className="px-4 pb-2 border-b border-white/5 flex justify-between items-center">
              <h3 className="font-semibold text-white/90">Comments</h3>
              <button onClick={onClose} className="p-1 text-white/50 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 scrollbar-hide">
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/40">
                  <p className="text-sm">No comments yet.</p>
                  <p className="text-xs">Start the conversation.</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 relative group">
                    <img 
                      src={comment.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${comment.profiles?.username}`} 
                      alt={comment.profiles?.username}
                      className="w-8 h-8 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                      onClick={() => navigate(`/profile/${comment.profiles?.id}`)}
                    />
                    <div className="flex flex-col flex-1">
                      <div className="flex items-start justify-between">
                        <span 
                          className="text-sm font-semibold text-white/90 cursor-pointer hover:text-neutral-300 transition-colors"
                          onClick={() => navigate(`/profile/${comment.profiles?.id}`)}
                        >
                          {comment.profiles?.username}
                        </span>
                        {session?.user?.id === comment.user_id && (
                          <button
                            onClick={() => handleDelete(comment.id)}
                            className="p-1 text-red-500/40 hover:text-red-500 transition-colors -mt-1 -mr-1"
                            title="Delete comment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-white/70 mt-0.5 leading-snug pr-4">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Area */}
            <div
              className="shrink-0 p-3 border-t border-white/5 bg-[#0a0a0a]"
              style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
            >
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <img
                  src={session?.user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${session?.user?.email}`}
                  alt="You"
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                />
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors placeholder:text-white/30"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || isSubmitting}
                  className="p-2 text-blue-500 hover:text-blue-400 disabled:opacity-40 transition-colors shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
