import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import { Heart, MessageCircle, UserPlus, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type Notification = {
  id: string
  type: 'like' | 'comment' | 'follow'
  created_at: string
  profiles: {
    id: string
    username: string
    avatar_url: string
  }
  content?: string // for comments
  post_id?: string // for likes/comments to show thumbnail
  post_image?: string
}

export default function Activity() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchActivity() {
      if (!session?.user?.id) return

      try {
        // Fetch Likes on User's posts
        const { data: likesData } = await supabase
          .from('likes')
          .select(`
            id, created_at, post_id,
            profiles!likes_user_id_fkey (id, username, avatar_url),
            posts!inner(user_id, image_url)
          `)
          .eq('posts.user_id', session.user.id)

        // Fetch Comments on User's posts
        const { data: commentsData } = await supabase
          .from('comments')
          .select(`
            id, content, created_at, post_id,
            profiles!comments_user_id_fkey (id, username, avatar_url),
            posts!inner(user_id, image_url)
          `)
          .eq('posts.user_id', session.user.id)

        // Fetch Follows
        const { data: followsData } = await supabase
          .from('follows')
          .select(`
            follower_id, created_at,
            profiles!follows_follower_id_fkey (id, username, avatar_url)
          `)
          .eq('following_id', session.user.id)

        // Format and merge data
        const formattedLikes: Notification[] = (likesData || []).map((like: any) => ({
          id: `like-${like.id}`,
          type: 'like',
          created_at: like.created_at,
          profiles: like.profiles,
          post_id: like.post_id,
          post_image: like.posts?.image_url
        }))

        const formattedComments: Notification[] = (commentsData || []).map((comment: any) => ({
          id: `comment-${comment.id}`,
          type: 'comment',
          created_at: comment.created_at,
          profiles: comment.profiles,
          content: comment.content,
          post_id: comment.post_id,
          post_image: comment.posts?.image_url
        }))

        const formattedFollows: Notification[] = (followsData || []).map((follow: any) => ({
          id: `follow-${follow.follower_id}`,
          type: 'follow',
          created_at: follow.created_at,
          profiles: { ...follow.profiles, id: follow.follower_id } // Ensure ID is mapped correctly
        }))

        const allNotifications = [...formattedLikes, ...formattedComments, ...formattedFollows]
        
        // Sort descending by created_at
        allNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        setNotifications(allNotifications)

        // Update last_checked_activity
        await supabase
          .from('profiles')
          .update({ last_checked_activity: new Date().toISOString() })
          .eq('id', session.user.id)
          
      } catch (err) {
        console.error("Error fetching activity:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchActivity()
  }, [session])

  // Simple time formatting
  const timeAgo = (dateString: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000)
    let interval = seconds / 3600
    if (interval > 24) return Math.floor(interval / 24) + 'd'
    if (interval >= 1) return Math.floor(interval) + 'h'
    interval = seconds / 60
    if (interval >= 1) return Math.floor(interval) + 'm'
    return 'now'
  }

  return (
    <div className="w-full min-h-screen bg-black flex flex-col pb-24">
      <div className="px-4 py-3 bg-black/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40">
        <h1 className="text-xl font-semibold tracking-tight">Activity</h1>
      </div>

      <div className="flex flex-col p-4">
        {isLoading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-neutral-500">
            <Heart className="w-8 h-8 mb-4" />
            <p>No activity yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <h2 className="text-sm font-semibold text-white/90">Earlier</h2>
            <div className="flex flex-col gap-4">
              {notifications.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="relative cursor-pointer" onClick={() => navigate(`/profile/${item.profiles?.id}`)}>
                    <img 
                      src={item.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${item.profiles?.username}`} 
                      alt={item.profiles?.username} 
                      className="w-11 h-11 rounded-full object-cover hover:opacity-80 transition-opacity"
                    />
                    <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-black">
                      {item.type === 'like' && <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />}
                      {item.type === 'comment' && <MessageCircle className="w-3.5 h-3.5 fill-blue-500 text-blue-500" />}
                      {item.type === 'follow' && <UserPlus className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />}
                    </div>
                  </div>
                  
                  <div className="flex-1 text-sm text-white/90 leading-tight">
                    <span 
                      className="font-semibold mr-1 cursor-pointer hover:text-neutral-300 transition-colors"
                      onClick={() => navigate(`/profile/${item.profiles?.id}`)}
                    >
                      {item.profiles?.username}
                    </span>
                    {item.type === 'like' && <span className="text-white/70">liked your post.</span>}
                    {item.type === 'comment' && (
                      <span className="text-white/70">
                        commented: {item.content}
                      </span>
                    )}
                    {item.type === 'follow' && <span className="text-white/70">started following you.</span>}
                    <span className="text-white/40 ml-2 text-xs">{timeAgo(item.created_at)}</span>
                  </div>

                  {/* Right side interaction (Post thumbnail or Follow button) */}
                  {item.post_image && (
                    <img 
                      src={item.post_image} 
                      alt="post thumbnail" 
                      onClick={() => navigate(`/post/${item.post_id}`)}
                      className="w-11 h-11 object-cover rounded-sm border border-white/10 cursor-pointer hover:opacity-80 active:scale-95 transition-all" 
                    />
                  )}
                  {item.type === 'follow' && item.profiles?.id && (
                    <FollowButton targetUserId={item.profiles.id} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FollowButton({ targetUserId }: { targetUserId: string }) {
  const { session } = useAuth()
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.id) return
    supabase.from('follows')
      .select('*')
      .eq('follower_id', session.user.id)
      .eq('following_id', targetUserId)
      .single()
      .then(({ data }) => {
        setIsFollowing(!!data)
        setIsLoading(false)
      })
  }, [targetUserId, session])

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent navigating to profile when clicking follow
    if (!session?.user?.id) return
    setIsLoading(true)

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', session.user.id)
          .eq('following_id', targetUserId)
        setIsFollowing(false)
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: session.user.id,
            following_id: targetUserId
          })
        setIsFollowing(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button 
      onClick={handleFollowToggle}
      disabled={isLoading}
      className={`px-4 py-1.5 transition-colors rounded-lg text-sm font-semibold text-white ${
        isFollowing 
          ? 'bg-white/10 hover:bg-white/20' 
          : 'bg-blue-500 hover:bg-blue-600'
      } disabled:opacity-50`}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (isFollowing ? 'Following' : 'Follow')}
    </button>
  )
}
