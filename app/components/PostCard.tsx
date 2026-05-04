import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Share2, Link2, Trash2, Crown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthProvider'
import { CommentsDrawer } from './CommentsDrawer'
import { type StoryGroup } from './StoryViewer'
import { type Post } from '../pages/Home'
import { timeAgo } from '../lib/utils'

interface PostCardProps {
  post: Post
  setIsDockVisible: (v: boolean) => void
  storyGroups?: StoryGroup[]
  viewedStories?: Record<string, string>
  onStoryClick?: (userId: string) => void
  isPremiumUser?: boolean
}

export function PostCard({ 
  post, 
  setIsDockVisible,
  storyGroups = [],
  viewedStories = {},
  onStoryClick,
  isPremiumUser = false
}: PostCardProps) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isCommentsOpen, setIsCommentsOpen] = useState(false)
  const [showDoubleTapPulse, setShowDoubleTapPulse] = useState(false)
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null)
  const [isPostMenuOpen, setIsPostMenuOpen] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  const isOwnPost = session?.user?.id === post.user_id
  const isContentLocked = post.is_premium && !isPremiumUser && !isOwnPost

  // Check if post author has an active, unviewed story
  const authorStoryGroup = storyGroups.find(g => g.user_id === post.user_id)
  const hasUnviewedStory = (() => {
    if (!authorStoryGroup) return false
    const latestStory = authorStoryGroup.stories[authorStoryGroup.stories.length - 1]
    const viewedAt = viewedStories[post.user_id]
    return !viewedAt || new Date(viewedAt) < new Date(latestStory.created_at)
  })()

  useEffect(() => {
    // Fetch initial likes
    const fetchLikes = async () => {
      // Get count
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id)
      
      setLikeCount(count || 0)

      // Check if current user liked it
      if (session) {
        const { data } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', session.user.id)
          .single()
        
        if (data) setIsLiked(true)
        
        const { data: savedData } = await supabase
          .from('saved_posts')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', session.user.id)
          .single()
        
        if (savedData) setIsSaved(true)
      }
    }
    fetchLikes()
  }, [post.id, session])

  const toggleLike = async () => {
    if (!session) return
    
    // Optimistic UI update
    const newIsLiked = !isLiked
    setIsLiked(newIsLiked)
    setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1)

    if (newIsLiked) {
      await supabase.from('likes').insert({ post_id: post.id, user_id: session.user.id })
    } else {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', session.user.id)
    }
  }

  const toggleSave = async () => {
    if (!session) return
    
    const newIsSaved = !isSaved
    setIsSaved(newIsSaved)

    if (newIsSaved) {
      await supabase.from('saved_posts').insert({ post_id: post.id, user_id: session.user.id })
    } else {
      await supabase.from('saved_posts').delete().eq('post_id', post.id).eq('user_id', session.user.id)
    }
  }

  const handleMediaClick = () => {
    if (clickTimeout) {
      // Double tap detected!
      clearTimeout(clickTimeout)
      setClickTimeout(null)
      handleDoubleTap()
    } else {
      // Single tap (wait to see if it becomes a double tap)
      const timeout = setTimeout(() => {
        setClickTimeout(null)
      }, 300)
      setClickTimeout(timeout)
    }
  }

  const handleDoubleTap = () => {
    // Trigger custom glowing ripple animation
    setShowDoubleTapPulse(true)
    setTimeout(() => setShowDoubleTapPulse(false), 800)
    
    if (!isLiked) {
      toggleLike()
    }
  }

  const avatar = post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${post.profiles?.username || 'User'}`
  const username = post.profiles?.username || 'user'

  return (
    <article className="pb-6 border-b border-white/5 last:border-none">
      {/* Post Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div 
          onClick={() => {
            if (post.is_anonymous) return // Never navigate for anon posts
            if (hasUnviewedStory && onStoryClick) {
              onStoryClick(post.user_id)
            } else {
              navigate(`/profile/${post.user_id}`)
            }
          }}
          className={`flex items-center gap-3 ${post.is_anonymous ? 'cursor-default' : 'cursor-pointer group'}`}
        >
          <div className={`p-[2px] rounded-full ${
            post.is_anonymous
              ? 'bg-gradient-to-tr from-purple-500/60 to-purple-300/60'
              : hasUnviewedStory ? 'bg-gradient-to-tr from-rose-500 via-fuchsia-500 to-indigo-500'
              : post.profiles?.is_premium ? 'bg-gradient-to-tr from-yellow-500/80 to-yellow-200/80 shadow-[0_0_10px_rgba(234,179,8,0.2)]'
              : 'bg-transparent'
          }`}>
            <div className={`rounded-full ${hasUnviewedStory || post.profiles?.is_premium || post.is_anonymous ? 'bg-black p-[2px]' : ''}`}>
              {post.is_anonymous ? (
                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-sm">
                  👤
                </div>
              ) : (
                <img src={avatar} alt={username} className="w-8 h-8 rounded-full object-cover group-hover:opacity-80 transition-opacity" />
              )}
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm group-hover:text-neutral-300 transition-colors">
                {post.is_anonymous ? 'Anonymous' : username}
              </span>
              {!post.is_anonymous && post.profiles?.is_premium && (
                <Crown className="w-3.5 h-3.5 text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.6)]" />
              )}
            </div>
            {post.is_premium && (
              <span className="text-[10px] font-bold tracking-widest text-yellow-500/80 uppercase">Lura+ Exclusive</span>
            )}
            {post.is_anonymous && (
              <span className="text-[10px] text-purple-400/80">
                {post.user_id === session?.user?.id ? '👁 Only you know this is yours' : 'Anonymous post'}
              </span>
            )}
          </div>
        </div>
        <button 
          onClick={() => { setIsPostMenuOpen(true); setIsDockVisible(false) }}
          className="text-white/60 hover:text-white transition-colors p-1"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Post Media */}
      <div 
        className="relative w-full aspect-square bg-[#050505] overflow-hidden flex items-center justify-center cursor-pointer group"
        onClick={handleMediaClick}
      >
        <AnimatePresence>
          {showDoubleTapPulse && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0.8, filter: 'blur(0px)' }}
              animate={{ scale: 1.5, opacity: 0, filter: 'blur(20px)' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0 z-20 bg-gradient-to-tr from-rose-500/30 via-fuchsia-500/30 to-indigo-500/30 rounded-full mix-blend-screen pointer-events-none"
            />
          )}
        </AnimatePresence>
        
        {isContentLocked ? (
          <div className="w-full h-full bg-gradient-to-tr from-neutral-900 to-black flex items-center justify-center pointer-events-none" />
        ) : post.media_type === 'video' ? (
          <video 
            src={post.image_url} 
            className="w-full h-full object-contain"
            controls
            autoPlay
            muted
            loop
          />
        ) : (
          <img 
            src={post.image_url} 
            alt="Post content" 
            className="w-full h-full object-cover"
          />
        )}

        {/* Premium content lock overlay */}
        {isContentLocked && post.user_id !== session?.user?.id && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-md">
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <p className="text-white font-semibold text-sm tracking-wide">Premium Content</p>
            <p className="text-white/60 text-xs text-center px-8">Subscribe to Lura+ to unlock this post</p>
            <button
              onClick={() => navigate('/premium')}
              className="mt-2 px-5 py-2 rounded-full bg-white text-black text-xs font-bold tracking-widest uppercase hover:bg-neutral-200 transition-colors"
            >
              Upgrade to Lura+
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pt-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <motion.button 
            whileTap={{ scale: 0.8 }}
            onClick={toggleLike}
            className="transition-colors"
          >
            <Heart 
              className={`w-6 h-6 transition-colors duration-300 ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-white hover:text-neutral-400'}`} 
              strokeWidth={1.5} 
            />
          </motion.button>
          <button 
            onClick={() => {
              setIsCommentsOpen(true)
              setIsDockVisible(false)
            }} 
            className="hover:text-neutral-400 transition-colors"
          >
            <MessageCircle className="w-6 h-6 -scale-x-100 text-white" strokeWidth={1.5} />
          </button>

        </div>
        <button onClick={toggleSave} className="hover:text-neutral-400 transition-colors">
          <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-white text-white' : 'text-white'}`} strokeWidth={1.5} />
        </button>
      </div>

      {/* Likes */}
      <div className="px-4 pt-2">
        <span className="font-semibold text-sm">{likeCount} likes</span>
      </div>

      {/* Caption */}
      <div className="px-4 pt-1">
        <p className="text-sm">
          <span 
            onClick={() => {
              if (post.is_anonymous) return
              navigate(`/profile/${post.user_id}`)
            }}
            className={`font-semibold mr-2 ${post.is_anonymous ? 'cursor-default' : 'cursor-pointer hover:text-neutral-300 transition-colors'}`}
          >
            {post.is_anonymous ? 'Anonymous' : username}
          </span>
          <span className="text-neutral-200">{post.caption}</span>
        </p>
      </div>

      {/* Comments */}
      <div className="px-4 pt-1">
        <button 
          onClick={() => {
            setIsCommentsOpen(true)
            setIsDockVisible(false)
          }} 
          className="text-neutral-500 text-sm hover:text-neutral-400 transition-colors"
        >
          Add a comment...
        </button>
      </div>
      
      {/* Time */}
      <div className="px-4 pt-1">
        <span className="text-[10px] font-medium text-neutral-500 tracking-wide">{timeAgo(post.created_at)}</span>
      </div>

      <CommentsDrawer 
        isOpen={isCommentsOpen} 
        onClose={() => {
          setIsCommentsOpen(false)
          setIsDockVisible(true)
        }} 
        postId={post.id} 
      />

      {/* Post Options Sheet */}
      <AnimatePresence>
        {isPostMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsPostMenuOpen(false); setIsDockVisible(true) }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-black/70 backdrop-blur-2xl rounded-t-3xl z-50 border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
              style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}
            >
              <div className="w-full flex justify-center pt-3 pb-2" onClick={() => { setIsPostMenuOpen(false); setIsDockVisible(true) }}>
                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
              </div>

              <div className="p-3 flex flex-col gap-1">
                <button
                  onClick={() => {
                    setIsPostMenuOpen(false)
                    setIsDockVisible(true)
                    const url = `${window.location.origin}/post/${post.id}`
                    if (navigator.share) {
                      navigator.share({ title: `Post by @${username}`, url })
                    } else {
                      navigator.clipboard.writeText(url)
                      alert('Post link copied!')
                    }
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <Share2 className="w-5 h-5 text-neutral-300" />
                  <span className="font-medium text-sm">Share post</span>
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`)
                    setIsPostMenuOpen(false)
                    setIsDockVisible(true)
                    alert('Link copied to clipboard!')
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <Link2 className="w-5 h-5 text-neutral-300" />
                  <span className="font-medium text-sm">Copy link</span>
                </button>

                {isOwnPost && (
                  <>
                    <div className="h-px bg-white/5 my-1" />
                    <button
                      onClick={async () => {
                        if (!confirm('Delete this post?')) return
                        await supabase.from('posts').delete().eq('id', post.id)
                        setIsPostMenuOpen(false)
                        setIsDockVisible(true)
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl hover:bg-red-500/10 transition-colors text-left text-red-400"
                    >
                      <Trash2 className="w-5 h-5" />
                      <span className="font-medium text-sm">Delete post</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </article>
  )
}
