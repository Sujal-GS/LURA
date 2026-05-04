import React, { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'

export default function CameraModal({ 
  onClose, 
  onCapture 
}: { 
  onClose: () => void, 
  onCapture: (blob: Blob) => void 
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState('')
  const [isCapturing, setIsCapturing] = useState(false)

  useEffect(() => {
    let activeStream: MediaStream | null = null
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' },
          audio: false
        })
        activeStream = mediaStream
        setStream(mediaStream)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      } catch (err) {
        setError('Camera access denied or unavailable.')
      }
    }
    startCamera()
    
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const handleCapture = () => {
    if (!videoRef.current) return
    setIsCapturing(true)
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0)
      canvas.toBlob((blob) => {
        if (blob) {
          onCapture(blob)
        } else {
          setIsCapturing(false)
        }
      }, 'image/jpeg', 0.8)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 z-[200] bg-black flex flex-col"
    >
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-end z-10 pt-safe">
        <button onClick={onClose} className="p-2 bg-black/50 rounded-full text-white">
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-neutral-900">
        {error ? (
          <p className="text-white/50 p-6 text-center">{error}</p>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="h-32 bg-black flex items-center justify-center shrink-0 pb-safe">
        <button 
          onClick={handleCapture}
          disabled={!!error || isCapturing}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {isCapturing ? (
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          ) : (
            <div className="w-16 h-16 bg-white rounded-full" />
          )}
        </button>
      </div>
    </motion.div>
  )
}
