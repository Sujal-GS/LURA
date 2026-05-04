import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Camera, Ghost } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthProvider'

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  currentProfile: any
}

export function EditProfileModal({ isOpen, onClose, onSuccess, currentProfile }: EditProfileModalProps) {
  const { session } = useAuth()
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [ghostMode, setGhostMode] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (currentProfile) {
      setUsername(currentProfile.username || '')
      setFullName(currentProfile.full_name || '')
      setBio(currentProfile.bio || '')
      setGhostMode(currentProfile.ghost_mode || false)
      setAvatarPreview(currentProfile.avatar_url || '')
    }
  }, [currentProfile])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return

    setIsSaving(true)
    setError('')

    try {
      let avatarUrl = currentProfile.avatar_url

      // Upload new avatar if changed
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${session.user.id}/avatar_${Math.random()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('posts') // using posts bucket for simplicity
          .upload(fileName, avatarFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName)
        
        avatarUrl = publicUrl
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username,
          full_name: fullName,
          bio,
          ghost_mode: ghostMode,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id)

      if (updateError) throw updateError

      // Keep Auth session metadata in sync with profile
      await supabase.auth.updateUser({
        data: {
          avatar_url: avatarUrl,
          full_name: fullName,
          username: username
        }
      })

      onSuccess()
    } catch (err: any) {
      console.error('Error updating profile:', err)
      setError(err.message || 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-[#0a0a0a] rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
          >
            <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h2 className="font-semibold text-white">Edit Profile</h2>
              <button onClick={onClose} className="p-1 text-white/50 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 flex flex-col gap-6">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group cursor-pointer">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 bg-neutral-900">
                    <img 
                      src={avatarPreview || `https://ui-avatars.com/api/?name=${username}`} 
                      alt="Avatar" 
                      className="w-full h-full object-cover group-hover:opacity-50 transition-opacity"
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>
                <button type="button" className="text-blue-500 text-sm font-medium" onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}>
                  Change Profile Photo
                </button>
              </div>

              {/* Form Fields */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Username</label>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-transparent border-b border-white/10 py-2 text-white focus:outline-none focus:border-white transition-colors"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Name</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-transparent border-b border-white/10 py-2 text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Bio</label>
                  <textarea 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="bg-transparent border-b border-white/10 py-2 text-white focus:outline-none focus:border-white transition-colors resize-none"
                    placeholder="Write something about yourself..."
                  />
                </div>
                
                {currentProfile.is_premium && (
                  <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                          <Ghost className="w-4 h-4 text-neutral-400" /> Ghost Mode
                        </span>
                        <span className="text-[9px] uppercase font-bold tracking-widest bg-white text-black px-1.5 py-0.5 rounded-sm">Premium</span>
                      </div>
                      <span className="text-xs text-neutral-500 mt-1">Browse profiles and stories anonymously.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGhostMode(!ghostMode)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${ghostMode ? 'bg-white' : 'bg-white/20'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${ghostMode ? 'bg-black translate-x-5' : 'bg-white translate-x-0'}`} />
                    </button>
                  </div>
                )}
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <button 
                type="submit"
                disabled={isSaving}
                className="w-full py-3 bg-white/10 backdrop-blur-md border border-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors flex items-center justify-center mt-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Profile'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
