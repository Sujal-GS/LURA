import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MessageCircle, Send, Bookmark, Loader2, Search, Trash2, Share2, Link2, MoreHorizontal, UserPlus, Crown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import { CommentsDrawer } from '../components/CommentsDrawer'
import { useOutletContext, useNavigate, Link } from 'react-router-dom'
import { CreateStoryModal } from '../components/CreateStoryModal'
import { StoryViewer, type StoryGroup } from '../components/StoryViewer'
import { Plus } from 'lucide-react'

export type Post = {
  id: string
  user_id: string
  image_url: string
  media_type: 'image' | 'video'
  caption: string
  created_at: string
  is_premium: boolean
  is_anonymous: boolean
  profiles: {
    username: string
    avatar_url: string
    is_premium?: boolean
    is_banned?: boolean
  }
}

function StoryRail({ 
  storyGroups, 
  onStoryClick,
  onAddStoryClick,
  viewedStories,
  currentUserProfile
}: { 
  storyGroups: StoryGroup[], 
  onStoryClick: (index: number) => void,
  onAddStoryClick: () => void,
  viewedStories: Record<string, string>,
  currentUserProfile: any
}) {
  const { session } = useAuth()
  const userAvatar = currentUserProfile?.avatar_url || session?.user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${session?.user?.email}`

  const currentUserGroupIdx = storyGroups.findIndex(g => g.user_id === session?.user?.id)
  const currentUserGroup = currentUserGroupIdx !== -1 ? storyGroups[currentUserGroupIdx] : null

  const isGroupViewed = (group: StoryGroup | null) => {
    if (!group) return true
    const latestStory = group.stories[group.stories.length - 1]
    const viewedAt = viewedStories[group.user_id]
    return viewedAt && new Date(viewedAt) >= new Date(latestStory.created_at)
  }

  const currentUserViewed = isGroupViewed(currentUserGroup)

  return (
    <div className="w-full overflow-x-auto scrollbar-hide py-4 px-2 border-b border-white/5">
      <div className="flex gap-4 px-2">
        
        {/* Current User Story Button */}
        <div className="flex flex-col items-center gap-1 cursor-pointer group shrink-0">
          <div className={`relative p-[2px] rounded-full ${currentUserGroup && !currentUserViewed ? 'bg-gradient-to-tr from-rose-500 via-fuchsia-500 to-indigo-500' : 'bg-white/20'}`}>
            <div 
              className="bg-[#050505] p-[2px] rounded-full"
              onClick={() => currentUserGroup ? onStoryClick(currentUserGroupIdx) : onAddStoryClick()}
            >
              <img 
                src={currentUserGroup?.avatar_url || userAvatar} 
                alt="Your story" 
                className={`w-16 h-16 rounded-full object-cover group-hover:scale-95 transition-transform duration-300 ${!currentUserGroup ? 'opacity-60' : ''}`}
              />
            </div>
            <div 
              onClick={(e) => {
                e.stopPropagation()
                onAddStoryClick()
              }}
              className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-1 border-2 border-[#050505] hover:scale-110 transition-transform"
            >
              <Plus className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          </div>
          <span className="text-[11px] font-medium text-neutral-300 truncate w-16 text-center">
            Your story
          </span>
        </div>

        {/* Other Users' Stories */}
        {storyGroups.map((group, idx) => {
          if (group.user_id === session?.user?.id) return null;
          
          const hasViewed = isGroupViewed(group)
          
          return (
            <div key={group.user_id} onClick={() => onStoryClick(idx)} className="flex flex-col items-center gap-1 cursor-pointer group shrink-0">
              <div className={`relative p-[2px] rounded-full ${hasViewed ? 'bg-white/20' : 'bg-gradient-to-tr from-rose-500 via-fuchsia-500 to-indigo-500'}`}>
                <div className="bg-[#050505] p-[2px] rounded-full">
                  <img 
                    src={group.avatar_url || `https://ui-avatars.com/api/?name=${group.username}`} 
                    alt={group.username} 
                    className="w-16 h-16 rounded-full object-cover group-hover:scale-95 transition-transform duration-300"
                  />
                </div>
              </div>
              <span className="text-[11px] font-medium text-neutral-300 truncate w-16 text-center">
                {group.username}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function PostCard({ 
  post, 
  setIsDockVisible,
  storyGroups = [],
  viewedStories = {},
  onStoryClick,
  isPremiumUser = false
}: { 
  post: Post, 
  setIsDockVisible: (v: boolean) => void,
  storyGroups?: StoryGroup[],
  viewedStories?: Record<string, string>,
  onStoryClick?: (userId: string) => void,
  isPremiumUser?: boolean
}) {
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

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Lura Post',
          text: `Check out this post by @${post.profiles?.username || 'user'}`,
          url: url
        })
      } catch (err) {
        console.error('Error sharing', err)
      }
    } else {
      navigator.clipboard.writeText(url)
      alert('Post link copied to clipboard!')
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

  // Simple time formatting
  const timeAgo = (dateString: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000)
    let interval = seconds / 3600
    if (interval > 24) return Math.floor(interval / 24) + ' DAYS AGO'
    if (interval >= 1) return Math.floor(interval) + ' HOURS AGO'
    interval = seconds / 60
    if (interval >= 1) return Math.floor(interval) + ' MINUTES AGO'
    return 'JUST NOW'
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
            {!post.is_anonymous && post.profiles?.is_banned && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="px-1.5 py-0.5 rounded-md bg-red-500/20 border border-red-500/30 text-red-500 text-[9px] font-black uppercase tracking-[0.1em] shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                  BANNED ACCOUNT
                </span>
              </div>
            )}
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
        {/* Premium Badge removed from here to prevent blocking image */}
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

export default function Home() {
  const { setIsDockVisible } = useOutletContext<{ setIsDockVisible: (v: boolean) => void }>()
  const [posts, setPosts] = useState<Post[]>([])
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([])
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false)
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null)
  
  // Empty state data
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([])
  const [explorePosts, setExplorePosts] = useState<any[]>([])
  const [isFollowingMap, setIsFollowingMap] = useState<Record<string, boolean>>({})
  const [isPremiumUser, setIsPremiumUser] = useState(false)
  const [viewedStories, setViewedStories] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('lura_viewed_stories')
    return saved ? JSON.parse(saved) : {}
  })

  const markStoryAsViewed = (groupIdx: number) => {
    const group = storyGroups[groupIdx]
    if (!group) return
    const latestStory = group.stories[group.stories.length - 1]
    const newViewed = {
      ...viewedStories,
      [group.user_id]: latestStory.created_at
    }
    setViewedStories(newViewed)
    localStorage.setItem('lura_viewed_stories', JSON.stringify(newViewed))
  }

  const fetchPostsAndStories = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const currentUserId = sessionData.session?.user?.id
      
      if (!currentUserId) return

      // Fetch current user profile to ensure fresh avatar + premium status
      const { data: profileData } = await supabase
        .from('profiles')
        .select('avatar_url, username, is_premium')
        .eq('id', currentUserId)
        .single()
        
      if (profileData) {
        setCurrentUserProfile(profileData)
        setIsPremiumUser(profileData.is_premium || false)
      }

      // Fetch Follows
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId)
      
      const followingIds = followingData?.map(f => f.following_id) || []
      const feedUserIds = [currentUserId, ...followingIds]

      // Fetch Posts with likes_count for trending sort
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (username, avatar_url, is_premium, is_banned)
        `)
        .in('user_id', feedUserIds)
        .order('created_at', { ascending: false })
        .limit(50) // Fetch more posts so trending sort has data to work with

      if (postsError) throw postsError

      // Algorithmic trending sort:
      // score = likes_count / (hours_since_posted + 2)^1.5
      // This keeps recent posts high but surfaces popular older ones too
      const now = Date.now()
      const scoredPosts = (postsData as Post[]).map(post => {
        const hoursOld = (now - new Date(post.created_at).getTime()) / (1000 * 60 * 60)
        const likes = (post as any).likes_count || 0
        const trendScore = likes / Math.pow(hoursOld + 2, 1.5)
        return { ...post, _trendScore: trendScore }
      })

      scoredPosts.sort((a, b) => b._trendScore - a._trendScore)
      setPosts(scoredPosts as Post[])

      if ((postsData as Post[]).length === 0) {
        // Fetch suggested users (users not followed)
        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .neq('id', currentUserId)
          .not('id', 'in', `(${followingIds.length > 0 ? followingIds.join(',') : 'uuid-not-found'})`)
          .limit(10)
        
        if (usersData) setSuggestedUsers(usersData)

        // Fetch explore posts (recent popular posts)
        const { data: popularPosts } = await supabase
          .from('posts')
          .select(`
            id, image_url, media_type, user_id, is_premium,
            profiles (id, username, avatar_url)
          `)
          .eq('is_anonymous', false)
          .order('created_at', { ascending: false })
          .limit(20)
          
        if (popularPosts) {
          const isPremium = profileData?.is_premium || false
          const filteredExplore = popularPosts.filter(p => isPremium || !p.is_premium).slice(0, 9)
          setExplorePosts(filteredExplore)
        }
      }

      // Fetch Stories
      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select(`
          *,
          profiles (username, avatar_url, is_premium)
        `)
        .in('user_id', feedUserIds)
        .gt('created_at', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true })

      // Filter stories based on expiry (72h for Premium, 24h for Free)
      const currentDate = new Date()
      const validStories = (storiesData || []).filter((story: any) => {
        const isAuthorPremium = story.profiles?.is_premium || false
        const maxAgeHours = isAuthorPremium ? 72 : 24
        const storyAgeHours = (currentDate.getTime() - new Date(story.created_at).getTime()) / (1000 * 60 * 60)
        return storyAgeHours <= maxAgeHours
      })

      // Group stories by user
      const grouped = validStories.reduce((acc: any, story: any) => {
        if (!acc[story.user_id]) {
          acc[story.user_id] = {
            user_id: story.user_id,
            username: story.profiles?.username,
            avatar_url: story.profiles?.avatar_url,
            stories: []
          }
        }
        acc[story.user_id].stories.push(story)
        return acc
      }, {})

      setStoryGroups(Object.values(grouped))

    } catch (err) {
      console.error("Error fetching feed:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPostsAndStories()

    // Subscribe to new posts
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          // Re-fetch to get profile data with it
          fetchPostsAndStories()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'stories' },
        (payload) => {
          fetchPostsAndStories()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="w-full flex flex-col pb-20">
      <StoryRail 
        storyGroups={storyGroups} 
        viewedStories={viewedStories}
        onAddStoryClick={() => {
          setIsCreateStoryOpen(true)
          setIsDockVisible(false)
        }}
        onStoryClick={(idx) => {
          setActiveStoryIndex(idx)
          markStoryAsViewed(idx)
          setIsDockVisible(false)
        }}
        currentUserProfile={currentUserProfile}
      />
      <div className="flex flex-col">
        {isLoading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col w-full pb-10">
            <div className="flex flex-col items-center justify-center p-8 text-center gap-2">
              <h3 className="text-white font-semibold text-xl">Welcome to Lura!</h3>
              <p className="text-neutral-400 text-sm max-w-[280px]">
                When you follow people, you'll see their photos and videos here.
              </p>
            </div>
            
            {/* Suggested Users Carousel */}
            {suggestedUsers.length > 0 && (
              <div className="w-full mb-8">
                <div className="px-4 mb-3 flex justify-between items-center">
                  <span className="font-semibold text-white text-sm">Suggested for you</span>
                </div>
                <div className="flex overflow-x-auto gap-4 px-4 pb-4 scrollbar-hide snap-x">
                  {suggestedUsers.map(user => (
                    <div key={user.id} className="snap-start shrink-0 w-36 bg-[#0f0f0f] border border-white/5 rounded-xl p-4 flex flex-col items-center text-center">
                      <img 
                        src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}`} 
                        alt={user.username}
                        className="w-16 h-16 rounded-full object-cover mb-3 bg-neutral-800"
                      />
                      <span className="font-semibold text-sm text-white truncate w-full">{user.username}</span>
                      <span className="text-xs text-neutral-500 truncate w-full mb-4">{user.full_name || 'Suggested'}</span>
                      <button
                        onClick={async () => {
                          setIsFollowingMap(prev => ({...prev, [user.id]: true}))
                          const { data: sessionData } = await supabase.auth.getSession()
                          if (sessionData.session?.user) {
                            await supabase.from('follows').insert({ follower_id: sessionData.session.user.id, following_id: user.id })
                            fetchPostsAndStories()
                          }
                        }}
                        disabled={isFollowingMap[user.id]}
                        className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          isFollowingMap[user.id] 
                            ? 'bg-neutral-800 text-white cursor-default' 
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                      >
                        {isFollowingMap[user.id] ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Explore Grid -> Vertical Featured Creators */}
            {explorePosts.length > 0 && (
              <div className="w-full mb-8">
                <div className="px-4 mb-4">
                  <span className="font-semibold text-white text-sm">Discover Creators</span>
                </div>
                <div className="flex flex-col gap-6 px-4 pb-8">
                  {explorePosts.map((ep, i) => (
                    <Link 
                      key={ep.id} 
                      to={`/profile/${ep.user_id || ep.profiles?.id}`}
                      onClick={() => window.scrollTo(0, 0)}
                      className="block relative cursor-pointer group rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 w-full h-80 bg-neutral-900 border border-white/5 ring-1 ring-white/10"
                    >
                      {ep.media_type === 'video' ? (
                        <video src={ep.image_url} autoPlay muted loop playsInline className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none" />
                      ) : (
                        <img src={ep.image_url} alt="Explore" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none" loading="lazy" />
                      )}
                      
                      {/* Smooth gradient overlay for high contrast text */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
                      
                      {/* Creator Info and CTA */}
                      <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between z-10 pointer-events-none">
                        <div className="flex items-center gap-3">
                          <div className="p-[2px] bg-gradient-to-tr from-rose-500 via-fuchsia-500 to-indigo-500 rounded-full shadow-lg">
                            <img 
                              src={ep.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${ep.profiles?.username}`} 
                              className="w-12 h-12 rounded-full object-cover border-2 border-black" 
                              alt={ep.profiles?.username}
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-white text-lg font-bold tracking-tight drop-shadow-md">
                              {ep.profiles?.username}
                            </span>
                            <span className="text-white/80 text-xs font-medium uppercase tracking-wider mt-0.5">
                              Featured Creator
                            </span>
                          </div>
                        </div>
                        
                        <div className="hidden sm:flex bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-semibold border border-white/10 shadow-xl transition-colors group-hover:bg-white/30">
                          View Profile
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          posts.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              setIsDockVisible={setIsDockVisible}
              storyGroups={storyGroups}
              viewedStories={viewedStories}
              isPremiumUser={isPremiumUser}
              onStoryClick={(userId) => {
                const idx = storyGroups.findIndex(g => g.user_id === userId)
                if (idx !== -1) {
                  setActiveStoryIndex(idx)
                  markStoryAsViewed(idx)
                  setIsDockVisible(false)
                }
              }}
            />
          ))
        )}
      </div>

      <CreateStoryModal 
        isOpen={isCreateStoryOpen} 
        onClose={() => {
          setIsCreateStoryOpen(false)
          setIsDockVisible(true)
        }} 
        onSuccess={() => {
          setIsCreateStoryOpen(false)
          setIsDockVisible(true)
          fetchPostsAndStories()
        }}
      />

      {activeStoryIndex !== null && (
        <StoryViewer 
          groups={storyGroups} 
          initialGroupIndex={activeStoryIndex} 
          onClose={() => {
            // Also mark as viewed when closing, just to ensure if it auto-progressed
            // it catches the current index. But for simplicity, we mark on open.
            setActiveStoryIndex(null)
            setIsDockVisible(true)
          }} 
        />
      )}
    </div>
  )
}
