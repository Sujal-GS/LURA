import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PostCard } from '../components/PostCard'
import { type Post } from './Home'

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const { setIsDockVisible } = useOutletContext<{ setIsDockVisible: (v: boolean) => void }>()
  const [post, setPost] = useState<Post | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Show dock initially when entering this view, unless CommentsDrawer is opened by PostCard
    setIsDockVisible(true)
    
    async function fetchPost() {
      if (!postId) return
      
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            profiles (username, avatar_url, is_premium, is_banned)
          `)
          .eq('id', postId)
          .single()

        if (error) throw error
        setPost(data as Post)
      } catch (error) {
        console.error("Error fetching post:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPost()
  }, [postId, setIsDockVisible])

  return (
    <div className="w-full flex flex-col min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 px-4 py-3 bg-black/80 backdrop-blur-xl border-b border-white/5 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1 hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="font-semibold text-lg">Post</h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex justify-center p-20">
            <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
          </div>
        ) : !post ? (
          <div className="flex flex-col items-center justify-center p-20 text-neutral-500">
            <p>Post not found</p>
          </div>
        ) : (
          <PostCard post={post} setIsDockVisible={setIsDockVisible} />
        )}
      </div>
    </div>
  )
}
