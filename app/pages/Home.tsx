import React, { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useOutletContext, useNavigate, Link } from 'react-router-dom'
import { CreateStoryModal } from '../components/CreateStoryModal'
import { StoryViewer, type StoryGroup } from '../components/StoryViewer'
import { StoryRail } from '../components/StoryRail'
import { PostCard } from '../components/PostCard'

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

  const navigate = useNavigate()

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
        .limit(50)

      if (postsError) throw postsError

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
        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .neq('id', currentUserId)
          .not('id', 'in', `(${followingIds.length > 0 ? followingIds.join(',') : 'uuid-not-found'})`)
          .limit(10)
        
        if (usersData) setSuggestedUsers(usersData)

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

      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select(`
          *,
          profiles (username, avatar_url, is_premium)
        `)
        .in('user_id', feedUserIds)
        .gt('created_at', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true })

      const currentDate = new Date()
      const validStories = (storiesData || []).filter((story: any) => {
        const isAuthorPremium = story.profiles?.is_premium || false
        const maxAgeHours = isAuthorPremium ? 72 : 24
        const storyAgeHours = (currentDate.getTime() - new Date(story.created_at).getTime()) / (1000 * 60 * 60)
        return storyAgeHours <= maxAgeHours
      })

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

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        () => fetchPostsAndStories()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'stories' },
        () => fetchPostsAndStories()
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

            {explorePosts.length > 0 && (
              <div className="w-full mb-8">
                <div className="px-4 mb-4">
                  <span className="font-semibold text-white text-sm">Discover Creators</span>
                </div>
                <div className="flex flex-col gap-6 px-4 pb-8">
                  {explorePosts.map((ep) => (
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
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
                      
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
            setActiveStoryIndex(null)
            setIsDockVisible(true)
          }} 
        />
      )}
    </div>
  )
}
