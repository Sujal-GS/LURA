import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import { Settings, Grid, Bookmark, Loader2, X, LogOut, ChevronRight, Share2, Crown, Lock, ShieldAlert } from 'lucide-react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { EditProfileModal } from '../components/EditProfileModal'
import { FollowListModal } from '../components/FollowListModal'

type Post = {
  id: string
  image_url: string
  media_type: 'image' | 'video'
  is_premium?: boolean
  user_id?: string
  media_url?: string
  is_anonymous?: boolean
}

export default function Profile() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const { setIsDockVisible } = useOutletContext<{ setIsDockVisible: (v: boolean) => void }>()
  const [posts, setPosts] = useState<Post[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const [followModalType, setFollowModalType] = useState<'followers' | 'following' | 'views' | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'premium' | 'saved' | 'vault'>('posts')
  const [savedPosts, setSavedPosts] = useState<Post[]>([])
  const [vaultMedia, setVaultMedia] = useState<any[]>([])
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false)
  const [vaultPinInput, setVaultPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [isPremiumUser, setIsPremiumUser] = useState(false)
  const [profileViewCount, setProfileViewCount] = useState(0)
  const [recentViewers, setRecentViewers] = useState<any[]>([])

  const targetUserId = userId || session?.user?.id

  const fetchUserData = async () => {
      if (!targetUserId) return
      
      setIsLoading(true)
      try {
        // Fetch Profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetUserId)
          .single()
        
        if (profileData) setProfile(profileData)

        // Fetch Posts
        let postsQuery = supabase
          .from('posts')
          .select('id, image_url, media_type, is_premium, user_id, is_anonymous')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false })

        // If viewing someone else's profile, hide their anonymous posts
        if (targetUserId !== session?.user?.id) {
          postsQuery = postsQuery.or('is_anonymous.is.null,is_anonymous.eq.false')
        }

        const { data: postsData } = await postsQuery

        if (postsData) setPosts(postsData)

        // Fetch Saved Posts if this is the current user's profile
        if (session?.user?.id && targetUserId === session.user.id) {
          const { data: savedData } = await supabase
            .from('saved_posts')
            .select('post_id, posts(id, image_url, media_type, is_premium, user_id)')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
          
          if (savedData) {
            const parsedSavedPosts = savedData.map((s: any) => s.posts).filter(Boolean) as Post[]
            setSavedPosts(parsedSavedPosts)
          }

          // Fetch Vault Media
          const { data: vaultData } = await supabase
            .from('vault_media')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
          
          if (vaultData) {
            setVaultMedia(vaultData)
          }
        }

        // Fetch Followers count
        const { count: fCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', targetUserId)
        
        setFollowersCount(fCount || 0)

        // Fetch Following count
        const { count: fwCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', targetUserId)
        
        setFollowingCount(fwCount || 0)

        // Check if current user is following this profile
        if (session?.user?.id && targetUserId !== session.user.id) {
          const { data: followData } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', session.user.id)
            .eq('following_id', targetUserId)
            .single()
          
          setIsFollowing(!!followData)
        }
      } catch (err) {
        console.error("Error fetching user data:", err)
      } finally {
        setIsLoading(false)
      }

      // Check if current logged-in user is premium
      if (session?.user?.id) {
        const { data: premiumData } = await supabase
          .from('profiles')
          .select('is_premium, ghost_mode')
          .eq('id', session.user.id)
          .single()
        
        if (premiumData) setIsPremiumUser(premiumData.is_premium || false)

        // Log a profile view (only when viewing someone else's profile)
        if (session?.user?.id && targetUserId !== session.user.id && !premiumData?.ghost_mode) {
          await supabase.from('profile_views').insert({
            viewer_id: session.user.id,
            viewed_id: targetUserId
          }).then(() => {}) // fire-and-forget, ignore errors
        }

        // Fetch profile views for OWN profile (premium users only)
        if (targetUserId === session?.user?.id && premiumData?.is_premium) {
          const { data: viewsData } = await supabase
            .from('profile_views')
            .select('viewer_id, viewed_at, profiles!viewer_id(id, username, avatar_url)')
            .eq('viewed_id', targetUserId)
            .gt('viewed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('viewed_at', { ascending: false })
            .limit(50)

          if (viewsData) {
            setProfileViewCount(viewsData.length)
            // Deduplicate by viewer_id to get unique visitors
            const seen = new Set()
            const unique = viewsData.filter((v: any) => {
              if (seen.has(v.viewer_id)) return false
              seen.add(v.viewer_id)
              return true
            })
            setRecentViewers(unique.slice(0, 8).map((v: any) => v.profiles))
          }
        }
      }
  }



  useEffect(() => {
    fetchUserData()
  }, [targetUserId, session])

  const handleVaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.vault_pin) {
      if (vaultPinInput.length < 4) {
        setPinError('PIN must be at least 4 digits')
        return
      }
      const { error } = await supabase.from('profiles').update({ vault_pin: vaultPinInput }).eq('id', session?.user?.id)
      if (!error) {
        setProfile({ ...profile, vault_pin: vaultPinInput })
        setIsVaultUnlocked(true)
        setPinError('')
      } else {
        setPinError('Failed to set PIN')
      }
    } else {
      if (vaultPinInput === profile.vault_pin) {
        setIsVaultUnlocked(true)
        setPinError('')
      } else {
        setPinError('Incorrect PIN')
      }
    }
  }

  const handleDownloadVaultMedia = async (url: string, type: string, id: string) => {
    setDownloadingId(id)
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `lura_vault_${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Failed to download media:', err)
      // Fallback
      window.open(url, '_blank')
    } finally {
      setTimeout(() => setDownloadingId(null), 1000)
    }
  }

  const handleFollowToggle = async () => {
    if (!session?.user?.id || !targetUserId) return
    setIsFollowLoading(true)

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', session.user.id)
          .eq('following_id', targetUserId)
        
        setIsFollowing(false)
        setFollowersCount(prev => Math.max(0, prev - 1))
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: session.user.id,
            following_id: targetUserId
          })
        
        setIsFollowing(true)
        setFollowersCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
    } finally {
      setIsFollowLoading(false)
    }
  }

  const [isAboutDevOpen, setIsAboutDevOpen] = useState(false)

  const isOwnProfile = !userId || userId === session?.user?.id

  // We should default to profile data if viewing someone else's profile.
  const avatarUrl = profile?.avatar_url || (isOwnProfile && session?.user?.user_metadata?.avatar_url) || `https://ui-avatars.com/api/?name=${profile?.username || 'User'}`
  const username = profile?.username || (isOwnProfile && session?.user?.user_metadata?.full_name) || 'User'
  const fullName = profile?.full_name || session?.user?.user_metadata?.full_name
  const bio = profile?.bio || 'Welcome to Lura. Minimalist experiences.'

  return (
    <div className="w-full flex flex-col pb-20">
      {/* Profile Header */}
      <div className="flex flex-col px-4 pt-6 pb-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-neutral-800 to-neutral-600">
              <div className="bg-black w-full h-full rounded-full overflow-hidden border-2 border-black">
                <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
              </div>
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{username}</h2>
                {profile?.is_premium && (
                  <Crown className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
                )}
                {profile?.is_banned && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-[0.15em] shadow-[0_0_15px_rgba(239,68,68,0.5)] border border-red-400">
                    <ShieldAlert className="w-3 h-3" />
                    Account Restricted
                  </div>
                )}
              </div>
              <div className="flex gap-4 mt-2 text-sm">
                <div className="flex flex-col items-center">
                  <span className="font-semibold">{posts.length}</span>
                  <span className="text-neutral-500 text-xs">posts</span>
                </div>
                <div 
                  className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setFollowModalType('followers')}
                >
                  <span className="font-semibold">{followersCount}</span>
                  <span className="text-neutral-500 text-xs">followers</span>
                </div>
                <div 
                  className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setFollowModalType('following')}
                >
                  <span className="font-semibold">{followingCount}</span>
                  <span className="text-neutral-500 text-xs">following</span>
                </div>
                {/* Profile views stat for premium users on own profile */}
                {isOwnProfile && isPremiumUser && profileViewCount > 0 && (
                  <div className="flex flex-col items-center">
                    <span className="font-semibold text-purple-400">{profileViewCount}</span>
                    <span className="text-neutral-500 text-xs">views</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1 mb-4">
          <span className="font-medium text-sm">{fullName}</span>
          <span className="text-sm text-neutral-300 whitespace-pre-wrap">{bio}</span>
        </div>

        {/* Profile Views Card — only shown to premium users on their own profile */}
        {isOwnProfile && isPremiumUser && profileViewCount > 0 && (
          <div 
            onClick={() => setFollowModalType('views')}
            className="mb-4 rounded-2xl bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-500/20 px-4 py-3 cursor-pointer hover:border-purple-500/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-purple-300">👁 Profile Views</span>
              <span className="text-xs text-purple-400/70">{profileViewCount} recent view{profileViewCount !== 1 ? 's' : ''}</span>
            </div>
            {recentViewers.length > 0 && (
              <div className="flex items-center gap-1.5">
                {recentViewers.map((viewer, i) => (
                  <img
                    key={i}
                    src={viewer?.avatar_url || `https://ui-avatars.com/api/?name=${viewer?.username}`}
                    alt={viewer?.username}
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/profile/${viewer?.id}`)
                    }}
                    className="w-8 h-8 rounded-full object-cover border-2 border-purple-500/30 cursor-pointer hover:scale-110 transition-transform"
                    title={`@${viewer?.username}`}
                  />
                ))}
                {profileViewCount > 8 && (
                  <span className="text-xs text-purple-400/60 ml-1">+{profileViewCount - 8} more</span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {isOwnProfile ? (
            <button 
              onClick={() => setIsEditProfileOpen(true)}
              className="flex-1 py-1.5 bg-white/10 hover:bg-white/20 transition-colors rounded-lg font-medium text-sm"
            >
              Edit profile
            </button>
          ) : (
            <button 
              onClick={handleFollowToggle}
              disabled={isFollowLoading}
              className={`flex-1 transition-colors py-1.5 rounded-lg font-medium text-sm ${
                isFollowing 
                  ? 'bg-white/10 hover:bg-white/20 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              } disabled:opacity-50`}
            >
              {isFollowLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (isFollowing ? 'Following' : 'Follow')}
            </button>
          )}
          <button 
            onClick={() => {
              const url = `${window.location.origin}/profile/${targetUserId}`
              if (navigator.share) {
                navigator.share({
                  title: `${username}'s profile on Lura`,
                  text: `Check out @${username} on Lura!`,
                  url,
                })
              } else {
                navigator.clipboard.writeText(url)
                alert('Profile link copied to clipboard!')
              }
            }}
            className="flex-1 py-1.5 bg-white/10 hover:bg-white/20 transition-colors rounded-lg font-medium text-sm flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            Share profile
          </button>
          {isOwnProfile && (
            <button onClick={() => { setIsSettingsOpen(true); setIsDockVisible(false) }} className="p-1.5 bg-white/10 hover:bg-white/20 transition-colors rounded-lg">
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs / Saved Posts Header */}
      {activeTab === 'saved' || activeTab === 'vault' ? (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <button onClick={() => setActiveTab('posts')} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="font-semibold text-lg">{activeTab === 'saved' ? 'Saved Posts' : 'Private Vault'}</h2>
        </div>
      ) : (
        <div className="flex border-b border-white/5">
          <button 
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${activeTab === 'posts' ? 'border-white text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('premium')}
            className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${activeTab === 'premium' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
          >
            <Crown className="w-5 h-5" />
          </button>
          {targetUserId === session?.user?.id && isPremiumUser && (
            <button 
              onClick={() => setActiveTab('vault')}
              className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${activeTab === 'vault' ? 'border-purple-400 text-purple-400' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
            >
              <Lock className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {activeTab === 'vault' && !isVaultUnlocked ? (
        <div className="flex flex-col items-center justify-center p-10 pt-20">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{!profile?.vault_pin ? 'Setup Vault PIN' : 'Enter Vault PIN'}</h2>
          <p className="text-sm text-neutral-400 text-center mb-6">
            {!profile?.vault_pin ? 'Create a 4-digit PIN to secure your private vault.' : 'Enter your PIN to access your saved disappearing content.'}
          </p>
          <form onSubmit={handleVaultSubmit} className="flex flex-col w-full max-w-[200px] gap-4">
            <input 
              type="password" 
              maxLength={4}
              value={vaultPinInput}
              onChange={(e) => setVaultPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-white transition-colors text-white"
            />
            {pinError && <p className="text-red-400 text-xs text-center">{pinError}</p>}
            <button type="submit" className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-neutral-200 transition-colors">
              {!profile?.vault_pin ? 'Set PIN' : 'Unlock'}
            </button>
          </form>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center p-10">
          <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
        </div>
      ) : (activeTab === 'saved' ? savedPosts : activeTab === 'vault' ? vaultMedia : posts.filter(p => activeTab === 'premium' ? p.is_premium : !p.is_premium)).length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 text-neutral-500">
          <div className="w-16 h-16 border-2 border-neutral-800 rounded-full flex items-center justify-center mb-4">
            {activeTab === 'posts' ? <Grid className="w-8 h-8" /> : activeTab === 'premium' ? <Crown className="w-8 h-8" /> : activeTab === 'vault' ? <Lock className="w-8 h-8" /> : <Bookmark className="w-8 h-8" />}
          </div>
          <p className="font-medium text-white mb-1">
            {activeTab === 'posts' ? 'No Posts Yet' : activeTab === 'premium' ? 'No Premium Content' : activeTab === 'vault' ? 'Vault is Empty' : 'No Saved Posts'}
          </p>
          <p className="text-sm text-center">
            {activeTab === 'posts' ? 'Share photos to see them here.' : activeTab === 'premium' ? 'Exclusive premium content will appear here.' : activeTab === 'vault' ? 'Save expiring stories to your vault.' : 'When you save photos, they will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5">
          {(activeTab === 'saved' ? savedPosts : activeTab === 'vault' ? vaultMedia : posts.filter(p => activeTab === 'premium' ? p.is_premium : !p.is_premium)).map(post => {
            const isContentLocked = post.is_premium && !isPremiumUser && post.user_id !== session?.user?.id;

            return (
              <div 
                key={post.id} 
                onClick={(e) => {
                  if (activeTab === 'vault') {
                    e.stopPropagation()
                    handleDownloadVaultMedia(post.image_url || post.media_url || '', post.media_type, post.id)
                  } else {
                    navigate(`/post/${post.id}`)
                  }
                }}
                className="aspect-square bg-white/5 relative group cursor-pointer overflow-hidden"
              >
                {isContentLocked ? (
                  <div className="w-full h-full bg-neutral-900 flex items-center justify-center border border-white/5">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                  </div>
                ) : post.media_type === 'video' ? (
                  <>
                    <video src={post.image_url || post.media_url} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 text-white">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </div>
                  </>
                ) : (
                  <img src={post.image_url || post.media_url} alt="Post" className="w-full h-full object-cover" />
                )}
                {post.is_anonymous && (
                  <div className="absolute top-2 left-2 text-purple-400 drop-shadow-md bg-black/40 rounded-full p-1" title="Anonymous Post">
                    👤
                  </div>
                )}
                <div className={`absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center ${downloadingId === post.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  {downloadingId === post.id ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-6 h-6 animate-spin text-white mb-2" />
                      <span className="text-white font-bold text-xs tracking-wide">Downloading...</span>
                    </div>
                  ) : (
                    <span className="text-white font-medium text-sm">
                      {isContentLocked ? 'Unlock' : activeTab === 'vault' ? 'Download' : 'View'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <EditProfileModal 
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        onSuccess={() => {
          setIsEditProfileOpen(false)
          fetchUserData()
        }}
        currentProfile={profile}
      />
      <FollowListModal
        isOpen={followModalType !== null}
        onClose={() => setFollowModalType(null)}
        userId={targetUserId || ''}
        type={followModalType}
      />

      {/* Settings Sheet */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsSettingsOpen(false); setIsDockVisible(true) }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-black/70 backdrop-blur-2xl rounded-t-3xl z-50 flex flex-col border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
            >
              {/* Handle */}
              <div className="w-full flex justify-center pt-3 pb-1" onClick={() => { setIsSettingsOpen(false); setIsDockVisible(true) }}>
                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <h2 className="font-semibold text-lg">Settings</h2>
                <button onClick={() => { setIsSettingsOpen(false); setIsDockVisible(true) }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div 
                className="p-3 flex flex-col gap-1"
                style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}
              >
                <button
                  onClick={() => {
                    setIsSettingsOpen(false)
                    setIsDockVisible(true)
                    setIsEditProfileOpen(true)
                  }}
                  className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <span className="font-medium text-sm">Edit Profile</span>
                  <ChevronRight className="w-4 h-4 text-neutral-500" />
                </button>

                <button
                  onClick={() => {
                    setIsSettingsOpen(false)
                    setIsDockVisible(true)
                    setActiveTab('saved')
                  }}
                  className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <span className="font-medium text-sm">Saved Posts</span>
                  <Bookmark className="w-4 h-4 text-neutral-500" />
                </button>

                <button
                  onClick={() => setIsAboutDevOpen(true)}
                  className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">About the Developer</span>
                    <span className="text-[10px] text-neutral-500">Meet the architect of Lura</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-500" />
                </button>

                <div className="h-px bg-white/5 my-1" />

                <button
                  onClick={async () => {
                    setIsSettingsOpen(false)
                    setIsDockVisible(true)
                    await signOut()
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl hover:bg-red-500/10 transition-colors text-left text-red-400"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-medium text-sm">Log Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* About Dev Modal */}
      <AnimatePresence>
        {isAboutDevOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAboutDevOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="absolute top-4 right-4 z-10">
                <button 
                  onClick={() => setIsAboutDevOpen(false)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col">
                {/* Header/Hero */}
                <div className="h-32 bg-gradient-to-br from-neutral-900 to-black border-b border-white/5 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,#3b82f6,transparent)]" />
                  </div>
                  <h3 className="text-white/20 font-black text-6xl tracking-tighter select-none">ARCHITECT</h3>
                </div>

                {/* Content */}
                <div className="px-6 pb-8 -mt-12 relative">
                  <div className="w-24 h-24 rounded-3xl p-1 bg-gradient-to-tr from-blue-500 to-purple-600 shadow-2xl mb-4">
                    <div className="bg-black w-full h-full rounded-[20px] overflow-hidden">
                      <img 
                        src="/dev.jpg" 
                        alt="Sujal G S" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=Sujal+GS&background=000&color=fff`
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 mb-6">
                    <h2 className="text-2xl font-bold tracking-tight">Sujal G S</h2>
                    <p className="text-blue-400 text-sm font-medium">Cybersecurity Graduate & Security Architect</p>
                    <p className="text-neutral-500 text-xs">Arch Linux Power User • Security Enthusiast</p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">The Mission</h4>
                      <p className="text-sm text-neutral-300 leading-relaxed">
                        Sujal is a <span className="text-white font-semibold">Cybersecurity Graduate</span> dedicated to building hardened, privacy-first digital ecosystems. 
                        As the architect of Lura, he leverages his expertise in security research and real-time systems to create a platform where data integrity is never a compromise.
                      </p>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Engineering Edge</h4>
                      <div className="flex flex-wrap gap-2">
                        {['Arch Linux', 'Security Hardening', 'Ethical Hacking', 'Real-time Arch', 'Supabase'].map(skill => (
                          <span key={skill} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-medium text-neutral-300">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <a 
                        href="https://www.linkedin.com/in/sujal-g-s/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 bg-white text-black font-bold py-3 rounded-2xl text-center text-xs hover:bg-neutral-200 transition-colors"
                      >
                        LinkedIn
                      </a>
                      <a 
                        href="https://github.com/Sujal-GS" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 bg-white/5 border border-white/10 text-white font-bold py-3 rounded-2xl text-center text-xs hover:bg-white/10 transition-colors"
                      >
                        GitHub
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
