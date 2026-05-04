import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Lock, Loader2 } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { supabase } from '../lib/supabase'

export type Story = {
  id: string
  image_url: string
  media_type: 'image' | 'video'
  created_at: string
}

export type StoryGroup = {
  user_id: string
  username: string
  avatar_url: string
  stories: Story[]
}

interface StoryViewerProps {
  groups: StoryGroup[]
  initialGroupIndex: number
  onClose: () => void
}

export function StoryViewer({ groups, initialGroupIndex, onClose }: StoryViewerProps) {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isSavingToVault, setIsSavingToVault] = useState(false)
  const { session } = useAuth()

  const currentGroup = groups[currentGroupIndex]
  const currentStory = currentGroup?.stories[currentStoryIndex]
  const videoRef = useRef<HTMLVideoElement>(null)

  const STORY_DURATION = 5000 // 5 seconds per image

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  useEffect(() => {
    setCurrentStoryIndex(0)
    setProgress(0)
  }, [currentGroupIndex])

  useEffect(() => {
    setProgress(0)
  }, [currentStoryIndex])

  useEffect(() => {
    if (isPaused || !currentStory) return

    let animationFrameId: number
    let startTime = performance.now()

    const animateProgress = (currentTime: number) => {
      // If it's a video, rely on the video's timeupdate event instead of performance.now()
      if (currentStory.media_type === 'video' && videoRef.current) {
        // Video progress is handled in handleVideoTimeUpdate
      } else {
        const elapsedTime = currentTime - startTime
        const newProgress = (elapsedTime / STORY_DURATION) * 100

        if (newProgress >= 100) {
          handleNext()
        } else {
          setProgress(newProgress)
          animationFrameId = requestAnimationFrame(animateProgress)
        }
      }
    }

    if (currentStory.media_type === 'image') {
      animationFrameId = requestAnimationFrame(animateProgress)
    }

    return () => cancelAnimationFrame(animationFrameId)
  }, [currentStoryIndex, currentGroupIndex, isPaused, currentStory])

  const handleNext = () => {
    if (currentStoryIndex < currentGroup.stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1)
    } else if (currentGroupIndex < groups.length - 1) {
      setCurrentGroupIndex(prev => prev + 1)
    } else {
      onClose()
    }
  }

  const handlePrev = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1)
    } else if (currentGroupIndex > 0) {
      setCurrentGroupIndex(prev => prev - 1)
      setCurrentStoryIndex(groups[currentGroupIndex - 1].stories.length - 1)
    }
  }

  const handlePointerDown = () => setIsPaused(true)
  const handlePointerUp = () => setIsPaused(false)

  const handleTap = (e: React.MouseEvent) => {
    const width = window.innerWidth
    const clickX = e.clientX
    if (clickX < width / 3) {
      handlePrev()
    } else {
      handleNext()
    }
  }

  const handleVideoTimeUpdate = () => {
    if (videoRef.current && currentStory?.media_type === 'video') {
      const { currentTime, duration } = videoRef.current
      const newProgress = (currentTime / duration) * 100
      setProgress(newProgress)
    }
  }

  const handleVideoEnded = () => {
    handleNext()
  }

  const handleSaveToVault = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!session?.user?.id || !currentStory) return
    setIsSavingToVault(true)
    try {
      const { error } = await supabase.from('vault_media').insert({
        user_id: session.user.id,
        media_url: currentStory.image_url,
        media_type: currentStory.media_type
      })
      if (error) throw error
      alert('Saved to Private Vault!')
    } catch (err) {
      console.error(err)
      alert('Failed to save to vault.')
    } finally {
      setIsSavingToVault(false)
    }
  }

  if (!currentGroup || !currentStory) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center sm:p-4"
      >
        <div className="relative w-full max-w-[400px] h-[100dvh] sm:h-[85vh] sm:rounded-3xl overflow-hidden bg-[#111] flex flex-col shadow-2xl">
          
          {/* Progress Bars */}
          <div className="absolute top-0 inset-x-0 pt-4 px-2 flex gap-1 z-20 bg-gradient-to-b from-black/80 to-transparent pb-6">
            {currentGroup.stories.map((_, idx) => (
              <div key={idx} className="h-0.5 flex-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
                <div 
                  className="h-full bg-white transition-all duration-100 ease-linear"
                  style={{ 
                    width: idx < currentStoryIndex ? '100%' : idx === currentStoryIndex ? `${progress}%` : '0%' 
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-6 inset-x-0 px-4 flex items-center justify-between z-20">
            <div className="flex items-center gap-2">
              <img 
                src={currentGroup.avatar_url || `https://ui-avatars.com/api/?name=${currentGroup.username}`} 
                alt={currentGroup.username} 
                className="w-8 h-8 rounded-full border border-white/20"
              />
              <span className="text-white font-semibold text-sm drop-shadow-md">{currentGroup.username}</span>
            </div>
            <button onClick={onClose} className="p-1 text-white/80 hover:text-white drop-shadow-md">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Media Area */}
          <div 
            className="flex-1 relative bg-black flex items-center justify-center cursor-pointer"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onClick={handleTap}
          >
            {currentStory.media_type === 'video' ? (
              <video 
                ref={videoRef}
                src={currentStory.image_url} 
                className="w-full h-full object-cover"
                autoPlay 
                playsInline
                onTimeUpdate={handleVideoTimeUpdate}
                onEnded={handleVideoEnded}
              />
            ) : (
              <img 
                src={currentStory.image_url} 
                alt="Story" 
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Action Buttons */}
          {currentGroup.user_id === session?.user?.id && (
            <div className="absolute bottom-8 right-4 z-20">
              <button 
                onClick={handleSaveToVault}
                disabled={isSavingToVault}
                className="p-3 bg-black/50 hover:bg-black/80 backdrop-blur-md rounded-full text-white border border-white/20 shadow-lg flex items-center justify-center transition-all active:scale-95"
                title="Save to Private Vault"
              >
                {isSavingToVault ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5 text-purple-400" />}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
