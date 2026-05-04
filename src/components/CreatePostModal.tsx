import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, Loader2, ImagePlus } from 'lucide-react'
import Cropper from 'react-easy-crop'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthProvider'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type Step = 'select' | 'crop' | 'details'

export function CreatePostModal({ isOpen, onClose, onSuccess }: CreatePostModalProps) {
  const { session } = useAuth()
  const [step, setStep] = useState<Step>('select')
  const [file, setFile] = useState<File | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image')
  const [mediaUrl, setMediaUrl] = useState<string>('')
  
  // Crop state
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  
  // Details state
  const [caption, setCaption] = useState('')
  const [isPremium, setIsPremium] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')

  React.useEffect(() => {
    return () => {
      if (mediaUrl) URL.revokeObjectURL(mediaUrl)
    }
  }, [mediaUrl])

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
  const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
  // Images up to 50MB are auto-compressed — only truly massive files are rejected
  const MAX_IMAGE_SIZE = 50 * 1024 * 1024   // 50MB hard cap
  const MAX_VIDEO_SIZE = 100 * 1024 * 1024  // 100MB

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0])
    }
  }

  // Pre-decode any image (HEIC, large JPEG, PNG, etc.) into a browser-safe JPEG blob
  // via canvas at max 2048px. This is what gets passed to the cropper.
  const preProcessImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const blobUrl = URL.createObjectURL(file)
      const img = new window.Image()
      img.onload = () => {
        const MAX = 2048
        let w = img.naturalWidth
        let h = img.naturalHeight
        if (w > MAX || h > MAX) {
          const scale = MAX / Math.max(w, h)
          w = Math.round(w * scale)
          h = Math.round(h * scale)
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas not available')); return }
        ctx.drawImage(img, 0, 0, w, h)
        canvas.toBlob(blob => {
          URL.revokeObjectURL(blobUrl)
          if (!blob) { reject(new Error('Failed to decode image')); return }
          resolve(URL.createObjectURL(blob))
        }, 'image/jpeg', 0.92)
      }
      img.onerror = () => {
        URL.revokeObjectURL(blobUrl)
        reject(new Error('Failed to load image — format may not be supported by this browser.'))
      }
      img.src = blobUrl
    })
  }

  const processFile = async (selected: File) => {
    const isImage = ALLOWED_IMAGE_TYPES.includes(selected.type) || selected.type.startsWith('image/')
    const isVideo = ALLOWED_VIDEO_TYPES.includes(selected.type) || selected.type.startsWith('video/')

    if (!isImage && !isVideo) {
      setError('Unsupported file type. Please upload an image (JPEG, PNG, WebP) or video (MP4, MOV).')
      return
    }
    if (isImage && selected.size > MAX_IMAGE_SIZE) {
      setError(`This image is extremely large (${(selected.size / 1024 / 1024).toFixed(0)}MB) and can't be processed. Please use a smaller file.`)
      return
    }
    if (isVideo && selected.size > MAX_VIDEO_SIZE) {
      setError(`Video is too large (${(selected.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 100MB.`)
      return
    }

    setError('')
    setFile(selected)

    if (isImage) {
      // Pre-decode through canvas so the cropper always gets a valid, renderable JPEG
      setIsUploading(true) // reuse uploading state as a "processing" indicator
      try {
        const processedUrl = await preProcessImage(selected)
        setMediaUrl(processedUrl)
        setMediaType('image')
        setIsUploading(false)
        setStep('crop')
      } catch (err: any) {
        setIsUploading(false)
        setError(err.message || 'Failed to process image. Try a different file.')
      }
    } else {
      setMediaType('video')
      setMediaUrl(URL.createObjectURL(selected))
      setStep('crop')
    }
  }


  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  // Compress + crop image: max 1920px on longest side, 85% JPEG quality
  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob> => {
    const image = new window.Image()
    image.src = imageSrc
    await new Promise(resolve => image.onload = resolve)

    const MAX_DIMENSION = 1920
    let w = pixelCrop.width
    let h = pixelCrop.height
    if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(w, h)
      w = Math.round(w * scale)
      h = Math.round(h * scale)
    }

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No 2d context')
    ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, w, h)
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.85)
    })
  }

  const handleNext = async () => {
    if (step === 'crop') setStep('details')
    else if (step === 'details') handleUpload()
  }

  const handleUpload = async () => {
    if (!file || !session) return
    setIsUploading(true)
    setError('')
    try {
      let uploadBlob: Blob = file
      if (mediaType === 'image' && croppedAreaPixels) {
        uploadBlob = await getCroppedImg(mediaUrl, croppedAreaPixels)
      }
      const fileExt = mediaType === 'image' ? 'jpg' : file.name.split('.').pop()
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(fileName, uploadBlob, { cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(fileName)
      const { error: dbError } = await supabase.from('posts').insert({
        user_id: session.user.id,
        image_url: publicUrl,
        media_type: mediaType,
        caption: caption,
        is_premium: isPremium,
        is_anonymous: isAnonymous
      })
      if (dbError) throw dbError
      onSuccess()
      reset()
    } catch (err: any) {
      setError(err.message || 'Error uploading post')
    } finally {
      setIsUploading(false)
    }
  }

  const reset = () => {
    setStep('select')
    setFile(null)
    setMediaUrl('')
    setCaption('')
    setIsPremium(false)
    setIsAnonymous(false)
    setError('')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        /* Full-screen on mobile, centered on larger screens */
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={reset}
          />
          
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            /* On phones: full height sheet from bottom. On larger: centered box. */
            className="relative w-full sm:max-w-lg sm:rounded-2xl bg-[#0a0a0a] border-t sm:border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            style={{ 
              height: 'calc(100dvh - 48px)',
              maxHeight: '700px',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/50 shrink-0">
              {step !== 'select' ? (
                <button
                  onClick={() => setStep(step === 'details' ? 'crop' : 'select')}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
              ) : <div className="w-9" />}

              <h2 className="text-white font-semibold tracking-wide text-sm">
                {step === 'select' ? 'New post' : step === 'crop' ? 'Adjust' : 'Caption'}
              </h2>

              {step !== 'select' ? (
                <button
                  onClick={handleNext}
                  disabled={isUploading}
                  className="text-blue-400 font-semibold hover:text-blue-300 transition-colors disabled:opacity-50 text-sm px-1"
                >
                  {step === 'crop' ? 'Next' : isUploading ? 'Sharing...' : 'Share'}
                </button>
              ) : (
                <button onClick={reset} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5 text-white" />
                </button>
              )}
            </div>

            {/* Error Banner */}
            {error && (
              <div className="bg-red-500/20 text-red-400 text-xs p-2.5 text-center border-b border-red-500/20 shrink-0">
                {error}
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 flex flex-col relative bg-black min-h-0">

              {/* ── STEP 1: SELECT ── */}
              {step === 'select' && (
                <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
                  {isUploading ? (
                    /* Processing large image */
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <Loader2 className="w-9 h-9 text-blue-400 animate-spin" />
                      </div>
                      <div className="text-center">
                        <p className="text-white font-semibold">Processing image...</p>
                        <p className="text-neutral-500 text-sm mt-1">Compressing for upload</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <ImagePlus className="w-9 h-9 text-neutral-400" strokeWidth={1.5} />
                      </div>
                      <div className="text-center">

                    <p className="text-white text-lg font-medium mb-1">Add a photo or video</p>
                    <p className="text-neutral-500 text-sm">Share a moment with your followers</p>
                  </div>

                  <label className="w-full max-w-[240px] flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-black font-semibold text-sm active:scale-95 transition-transform cursor-pointer">
                    Choose from library
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                    />
                  </label>

                  <label className="w-full max-w-[240px] flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border border-white/15 bg-white/5 text-white font-semibold text-sm active:scale-95 transition-transform cursor-pointer">
                    Take a photo
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,video/*"
                      capture="environment"
                      onChange={handleFileSelect}
                    />
                  </label>
                </>
                  )}
                </div>
              )}


              {/* ── STEP 2: CROP ── */}
              {step === 'crop' && (
                <div className="flex-1 relative w-full bg-black">
                  {mediaType === 'image' ? (
                    <Cropper
                      image={mediaUrl}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                      style={{ containerStyle: { background: 'black' } }}
                    />
                  ) : (
                    <video
                      src={mediaUrl}
                      className="w-full h-full object-contain absolute inset-0"
                      controls
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  )}
                </div>
              )}

              {/* ── STEP 3: DETAILS ── */}
              {step === 'details' && (
                <div className="flex-1 flex flex-col overflow-y-auto">
                  <div className="w-full aspect-square bg-black shrink-0 border-b border-white/5">
                    {mediaType === 'image'
                      ? <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                      : <video src={mediaUrl} className="w-full h-full object-cover" muted playsInline />
                    }
                  </div>
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={session?.user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${session?.user?.email}`}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <span className="font-semibold text-sm text-white">
                        {session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0]}
                      </span>
                    </div>
                    <textarea
                      value={caption}
                      onChange={e => setCaption(e.target.value)}
                      placeholder="Write a caption..."
                      rows={4}
                      className="w-full bg-transparent text-white resize-none placeholder:text-neutral-500 text-sm outline-none leading-relaxed"
                    />
                    
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div>
                        <span className="text-white text-sm font-medium block">Premium Content</span>
                        <span className="text-neutral-500 text-xs">Only Lura+ subscribers can view this</span>
                      </div>
                      <button
                        onClick={() => setIsPremium(!isPremium)}
                        className={`w-11 h-6 rounded-full transition-colors relative ${isPremium ? 'bg-blue-500' : 'bg-neutral-700'}`}
                      >
                        <motion.div
                          layout
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="w-5 h-5 rounded-full bg-white absolute top-0.5"
                          style={{ left: isPremium ? 'calc(100% - 22px)' : '2px' }}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div>
                        <span className="text-white text-sm font-medium block">👤 Post Anonymously</span>
                        <span className="text-neutral-500 text-xs">Your name won't be shown on this post</span>
                      </div>
                      <button
                        onClick={() => setIsAnonymous(!isAnonymous)}
                        className={`w-11 h-6 rounded-full transition-colors relative ${isAnonymous ? 'bg-purple-500' : 'bg-neutral-700'}`}
                      >
                        <motion.div
                          layout
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="w-5 h-5 rounded-full bg-white absolute top-0.5"
                          style={{ left: isAnonymous ? 'calc(100% - 22px)' : '2px' }}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Uploading overlay */}
              {isUploading && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-9 h-9 text-white animate-spin" />
                    <span className="text-white font-medium text-sm">Sharing to Lura...</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
