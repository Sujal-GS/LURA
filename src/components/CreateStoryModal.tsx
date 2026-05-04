import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, ImagePlus, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthProvider'

interface CreateStoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateStoryModal({ isOpen, onClose, onSuccess }: CreateStoryModalProps) {
  const { session } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image')
  const [mediaUrl, setMediaUrl] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')

  React.useEffect(() => {
    return () => { if (mediaUrl) URL.revokeObjectURL(mediaUrl) }
  }, [mediaUrl])

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0]
      setFile(selected)
      setMediaType(selected.type.startsWith('video/') ? 'video' : 'image')
      setMediaUrl(URL.createObjectURL(selected))
      setError('')
    }
  }

  const handleShare = async () => {
    if (!file || !session) return
    setIsUploading(true)
    setError('')
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${session.user.id}/stories/${Math.random()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('posts').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(fileName)
      const { error: dbError } = await supabase.from('stories').insert({
        user_id: session.user.id,
        image_url: publicUrl,
        media_type: mediaType
      })
      if (dbError) throw dbError
      handleClose()
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to share story')
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setMediaUrl('')
    setError('')
    setIsUploading(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          />

          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full sm:max-w-sm bg-[#050505] sm:rounded-3xl rounded-t-3xl overflow-hidden border-t sm:border border-white/10 shadow-2xl flex flex-col"
            style={{ height: 'calc(100dvh - 60px)', maxHeight: '700px' }}
            onClick={e => e.stopPropagation()}
          >

            {/* Close button */}
            <div className="absolute top-4 right-4 z-20">
              <button
                onClick={handleClose}
                className="p-2 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            {!file ? (
              /* Pick media screen */
              <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <ImagePlus className="w-9 h-9 text-neutral-400" strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <p className="text-white text-lg font-medium mb-1">Add to your story</p>
                  <p className="text-neutral-500 text-sm">Visible to your followers for 24 hours</p>
                </div>

                <label className="w-full max-w-[240px] flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-black font-semibold text-sm active:scale-95 transition-transform cursor-pointer">
                  Choose from library
                  <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
                </label>

                <label className="w-full max-w-[240px] flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border border-white/15 bg-white/5 text-white font-semibold text-sm active:scale-95 transition-transform cursor-pointer">
                  Take a photo
                  <input type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={handleFileSelect} />
                </label>
              </div>
            ) : (
              /* Preview + share screen */
              <div className="flex-1 relative">
                {mediaType === 'video'
                  ? <video src={mediaUrl} className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop playsInline />
                  : <img src={mediaUrl} className="absolute inset-0 w-full h-full object-cover" alt="Story preview" />
                }
                {/* Gradient bottom */}
                <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col items-end gap-3"
                  style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
                >
                  {error && <p className="text-red-400 text-xs w-full text-center">{error}</p>}
                  <button
                    onClick={handleShare}
                    disabled={isUploading}
                    className="flex items-center gap-2 bg-white text-black px-7 py-3 rounded-full font-semibold text-sm active:scale-95 transition-transform disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>Share <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
