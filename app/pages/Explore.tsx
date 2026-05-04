import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Loader2, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

type Post = {
  id: string
  image_url: string
  media_type: 'image' | 'video'
  user_id: string
  is_anonymous: boolean
  profiles: {
    id: string
    username: string
  }
}

type ProfileSearchResult = {
  id: string
  username: string
  full_name: string
  avatar_url: string
}

export default function Explore() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    async function fetchExplorePosts() {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            id, image_url, media_type, user_id, is_anonymous,
            profiles (id, username)
          `)
          .order('created_at', { ascending: false })
          .limit(30)

        if (error) throw error
        setPosts(data as Post[])
      } catch (err) {
        console.error("Error fetching explore posts:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchExplorePosts()
  }, [])

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length === 0) {
        setSearchResults([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .ilike('username', `%${searchQuery}%`)
          .limit(20)

        if (!error && data) {
          setSearchResults(data)
        }
      } catch (err) {
        console.error("Error searching profiles:", err)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  return (
    <div className="w-full flex flex-col pb-24">
      {/* Search Header */}
      <div className="sticky top-0 z-40 px-4 py-3 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-5 h-5 text-neutral-500" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Lura..." 
            className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {searchQuery.trim().length > 0 ? (
        <div className="p-4 flex flex-col gap-4">
          {isSearching ? (
            <div className="flex justify-center p-10">
              <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 text-neutral-500">
              <User className="w-8 h-8 mb-4 opacity-50" />
              <p>No users found.</p>
            </div>
          ) : (
            searchResults.map(user => (
              <div 
                key={user.id} 
                onClick={() => navigate(`/profile/${user.id}`)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
              >
                <img 
                  src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}`} 
                  alt={user.username} 
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-white/90">{user.username}</span>
                  <span className="text-xs text-neutral-400">{user.full_name || 'Lura User'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="p-1">
          {isLoading ? (
            <div className="flex justify-center p-10">
              <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 text-neutral-500">
              <Search className="w-8 h-8 mb-4" />
              <p>Nothing to explore yet.</p>
            </div>
          ) : (
            <div className="columns-2 md:columns-3 gap-1 space-y-1">
              {posts.map(post => (
                <div 
                  key={post.id} 
                  onClick={() => navigate(`/post/${post.id}`)}
                  className="relative group cursor-pointer overflow-hidden break-inside-avoid bg-white/5 rounded-sm"
                >
                  {post.media_type === 'video' ? (
                    <>
                      <video src={post.image_url} className="w-full h-auto object-cover" />
                      <div className="absolute top-2 right-2 text-white/80 drop-shadow-md">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                      </div>
                    </>
                  ) : (
                    <img src={post.image_url} alt="Explore" className="w-full h-auto object-cover" loading="lazy" />
                  )}
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                    {post.is_anonymous ? (
                      <span className="text-purple-300 text-xs font-medium">👤 Anonymous</span>
                    ) : (
                      <span className="text-white text-xs font-medium truncate">{post.profiles?.username}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
