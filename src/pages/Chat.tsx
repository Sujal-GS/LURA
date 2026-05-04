import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Send, Image as ImageIcon, Loader2, X, Reply, Pencil, Camera, Mic, PlusCircle, MapPin, FileText, Trash2, Pin, PinOff } from 'lucide-react'
import CameraModal from '../components/CameraModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import { timeAgo } from '../lib/utils'

type Message = {
  id: string
  content: string
  sender_id: string
  created_at: string
  media_url: string | null
  media_type: 'image' | 'video' | 'audio' | 'document' | null
  reply_to_id: string | null
  is_edited: boolean
  edited_at: string | null
  is_silent: boolean
  is_pinned: boolean
}

export default function Chat() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { setIsDockVisible } = useOutletContext<{ setIsDockVisible: (v: boolean) => void }>()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<any>(null)
  const [otherUser, setOtherUser] = useState<any>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, message: Message } | null>(null)

  const [showCamera, setShowCamera] = useState(false)
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])

  // Typing indicator state
  const [isOtherTyping, setIsOtherTyping] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const presenceChannelRef = useRef<any>(null)

  // Seen receipts state
  const [isConversationRead, setIsConversationRead] = useState(false)

  useEffect(() => {
    let interval: any
    if (isRecording) {
      interval = setInterval(() => setRecordingDuration(prev => prev + 1), 1000)
    } else {
      setRecordingDuration(0)
    }
    return () => clearInterval(interval)
  }, [isRecording])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsDockVisible(false)
    const handleResize = () => {
      if (window.visualViewport) {
        const keyboardOpen = window.visualViewport.height < window.innerHeight * 0.8
        setIsKeyboardOpen(keyboardOpen)
        if (keyboardOpen) {
          forceScrollToBottom()
        }
      }
    }
    window.visualViewport?.addEventListener('resize', handleResize)
    return () => {
      setIsDockVisible(true)
      window.visualViewport?.removeEventListener('resize', handleResize)
    }
  }, [setIsDockVisible])

  useEffect(() => {
    if (!session?.user?.id || !conversationId) return

    const fetchData = async () => {
      setIsLoading(true)
      const { data: convData } = await supabase
        .from('conversations')
        .select(`*, user1:profiles!user1_id(*), user2:profiles!user2_id(*)`)
        .eq('id', conversationId)
        .single()

      if (convData) {
        setConversation(convData)
        setOtherUser(convData.user1_id === session.user.id ? convData.user2 : convData.user1)
      }

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const { data: msgsData } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: true })

      if (msgsData) setMessages(msgsData)

      if (convData?.last_message_sender_id !== session.user.id && !convData?.is_read) {
        await supabase.from('conversations').update({ is_read: true }).eq('id', conversationId)
      }

      setIsLoading(false)
      scrollToBottom(true)
    }

    fetchData()

    const channel = supabase.channel(`chat:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
        // Mark as read immediately if it's from the other user
        if (payload.new.sender_id !== session.user.id) {
          supabase.from('conversations').update({ is_read: true }).eq('id', conversationId)
        }
        scrollToBottom()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${conversationId}` }, (payload) => {
        setConversation((prev: any) => ({ ...prev, ...payload.new }))
        // When the other user reads our last message
        if (payload.new.is_read && payload.new.last_message_sender_id === session.user.id) {
          setIsConversationRead(true)
        }
      })
      .subscribe()

    // Presence channel for typing indicators
    const presenceChannel = supabase.channel(`typing:${conversationId}`, {
      config: { presence: { key: session.user.id } }
    })
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const otherTyping = Object.keys(state).some(
          key => key !== session.user.id && (state[key] as any)[0]?.typing === true
        )
        setIsOtherTyping(otherTyping)
      })
      .subscribe()
    presenceChannelRef.current = presenceChannel

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(presenceChannel)
    }
  }, [conversationId, session?.user?.id])

  const handleTogglePinMessage = async (msg: Message) => {

    setContextMenu(null)
    const { error } = await supabase
      .from('messages')
      .update({ is_pinned: !msg.is_pinned })
      .eq('id', msg.id)
    
    if (error) {
      console.error('Error toggling pin message', error)
    }
  }

  const handleUnsend = async (msg: Message) => {
    setContextMenu(null)
    // Optimistically remove from UI immediately
    setMessages(prev => prev.filter(m => m.id !== msg.id))
    try {
      const { error } = await supabase.from('messages').delete().eq('id', msg.id)
      if (error) {
        // Rollback if delete failed
        setMessages(prev => [...prev, msg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()))
        console.error('Error unsending message:', error)
        return
      }

      // Update the conversation's last_message using local state for speed/reliability
      const remainingMessages = messages.filter(m => m.id !== msg.id)
      const latest = remainingMessages[remainingMessages.length - 1]
      
      let newLastMessage = ''
      if (latest) {
        if (latest.media_type === 'audio') newLastMessage = '🎤 Voice Note'
        else if (latest.media_type === 'video') newLastMessage = '🎥 Video'
        else if (latest.media_type === 'document') newLastMessage = '📄 Document'
        else if (latest.media_type === 'image') newLastMessage = '📷 Image'
        else newLastMessage = latest.content
      }

      await supabase.from('conversations').update({
        last_message: newLastMessage,
        last_message_at: latest?.created_at || new Date().toISOString(),
        last_message_sender_id: latest?.sender_id || null,
        updated_at: new Date().toISOString()
      }).eq('id', conversationId)

      // Also delete the media file from storage if present
      if (msg.media_url) {
        const path = msg.media_url.split('/object/public/messages/').pop()
          || msg.media_url.split('/messages/').pop()
        if (path) {
          await supabase.storage.from('messages').remove([decodeURIComponent(path)])
        }
      }
    } catch (err) {
      // Rollback
      setMessages(prev => [...prev, msg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()))
      console.error('Error unsending message:', err)
    }
  }


  const forceScrollToBottom = () => {
    // Aggressive scroll lock: Force scrollTop to max every 20ms for 500ms
    // This perfectly counters the mobile browser's smooth keyboard slide animation
    let count = 0
    const interval = setInterval(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
      }
      count++
      if (count > 25) clearInterval(interval)
    }, 20)
  }

  const scrollToBottom = (instant = false) => {
    setTimeout(() => {
      if (instant) {
        if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    }, 50)
  }

  const broadcastTyping = () => {
    if (!presenceChannelRef.current || !session?.user?.id) return
    presenceChannelRef.current.track({ typing: true })
    // Auto-clear typing after 2s of silence
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      presenceChannelRef.current?.track({ typing: false })
    }, 2000)
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newMessage.trim() || isSending || !session?.user?.id) return
    // Stop typing broadcast immediately on send
    presenceChannelRef.current?.track({ typing: false })
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    setIsConversationRead(false) // reset read receipt on new send

    setIsSending(true)
    let content = newMessage.trim()
    
    try {
      if (editingMessage) {
        await supabase.from('messages').update({
          content,
          is_edited: true,
          edited_at: new Date().toISOString()
        }).eq('id', editingMessage.id)
        
        setEditingMessage(null)
      } else {
        const isSilent = content.toLowerCase().startsWith('@silent ') || content.toLowerCase() === '@silent'
        if (isSilent) {
          content = content.replace(/^@silent\s*/i, '')
        }
        if (!content) content = '🤫' // fallback if they just typed @silent
        
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: session.user.id,
          content,
          reply_to_id: replyingTo?.id || null,
          is_silent: isSilent
        })

        setReplyingTo(null)

        if (!isSilent) {
          await supabase.from('conversations').update({
            last_message: content,
            last_message_at: new Date().toISOString(),
            last_message_sender_id: session.user.id,
            is_read: false,
            updated_at: new Date().toISOString()
          }).eq('id', conversationId)
        } else {
          // Silent message: update timestamp but NOT unread status
          await supabase.from('conversations').update({
            last_message: content,
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).eq('id', conversationId)
        }
      }
      
      setNewMessage('')
      scrollToBottom()
    } catch (err) {
      console.error('Error sending message', err)
    } finally {
      setIsSending(false)
    }
  }

  const uploadAndSendMedia = async (file: File | Blob, type: 'image' | 'video' | 'audio' | 'document', extension: string) => {
    if (!session?.user?.id || !conversationId) return

    setIsUploading(true)
    try {
      const fileName = `${conversationId}/${Date.now()}.${extension}`

      const { error: uploadError } = await supabase.storage.from('messages').upload(fileName, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('messages').getPublicUrl(fileName)

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: session.user.id,
        content: '',
        media_url: publicUrl,
        media_type: type
      })

      const typeLabel = type === 'audio' ? '🎤 Voice Note' : type === 'video' ? '🎥 Video' : type === 'document' ? '📄 Document' : '📷 Image'

      await supabase.from('conversations').update({
        last_message: typeLabel,
        last_message_at: new Date().toISOString(),
        last_message_sender_id: session.user.id,
        is_read: false,
        updated_at: new Date().toISOString()
      }).eq('id', conversationId)

      scrollToBottom()
    } catch (err) {
      console.error('Error uploading media:', err)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (documentInputRef.current) documentInputRef.current.value = ''
    }
  }

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fileExt = file.name.split('.').pop() || 'file'
    await uploadAndSendMedia(file, 'document', fileExt)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fileExt = file.name.split('.').pop() || 'jpg'
    const type = file.type.startsWith('video/') ? 'video' : 'image'
    await uploadAndSendMedia(file, type, fileExt)
  }

  const handleMicClick = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop()
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data)
        }

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          stream.getTracks().forEach(track => track.stop())
          setIsRecording(false)
          await uploadAndSendMedia(audioBlob, 'audio', 'webm')
        }

        mediaRecorder.start()
        setIsRecording(true)
      } catch (err) {
        console.error('Error accessing microphone', err)
        alert("Could not access microphone.")
      }
    }
  }

  const handleSendLocation = () => {
    setShowPlusMenu(false)
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser")
      return
    }
    setIsSending(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const content = `📍 Shared Location\nhttps://maps.google.com/?q=${latitude},${longitude}`
        try {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_id: session?.user?.id,
            content,
            reply_to_id: replyingTo?.id || null
          })
          setReplyingTo(null)
          await supabase.from('conversations').update({
            last_message: '📍 Location',
            last_message_at: new Date().toISOString(),
            last_message_sender_id: session?.user?.id,
            is_read: false,
            updated_at: new Date().toISOString()
          }).eq('id', conversationId)
          scrollToBottom()
        } catch (err) {
          console.error(err)
        } finally {
          setIsSending(false)
        }
      },
      (err) => {
        setIsSending(false)
        console.error("Error getting location", err)
      }
    )
  }

  const handleAcceptRequest = async () => {
    await supabase.from('conversations').update({ status: 'accepted' }).eq('id', conversationId)
    setConversation((prev: any) => ({ ...prev, status: 'accepted' }))
  }

  const handleDeclineRequest = async () => {
    await supabase.from('conversations').delete().eq('id', conversationId)
    navigate('/messages')
  }

  const amIInitiator = conversation?.user1_id === session?.user?.id
  const isRequest = conversation?.status === 'pending'
  const showRequestPrompt = isRequest && !amIInitiator

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="w-full h-full min-h-0 flex flex-col bg-black text-white relative overflow-hidden"
    >
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5 flex items-center gap-3 px-4 py-3 shrink-0" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        {otherUser && (
          <div className="flex items-center gap-2" onClick={() => navigate(`/profile/${otherUser.id}`)}>
            <img 
              src={otherUser.avatar_url || `https://ui-avatars.com/api/?name=${otherUser.username}`} 
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="font-semibold">{otherUser.full_name || otherUser.username}</span>
          </div>
        )}
      </header>

      {/* Pinned Messages Bar */}
      {messages.filter(m => m.is_pinned).length > 0 && (
        <div className="bg-neutral-900/50 border-b border-white/5 px-4 py-2 flex items-center gap-3 overflow-x-auto no-scrollbar">
          <Pin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <div className="flex gap-2 min-w-0">
            {messages.filter(m => m.is_pinned).map(m => (
              <div 
                key={m.id}
                onClick={() => {
                  const el = document.getElementById(`msg-${m.id}`)
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}
                className="bg-white/5 rounded-lg px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-white/10 transition-colors shrink-0 max-w-[200px]"
              >
                <p className="text-xs text-white/70 truncate">
                  {m.media_type ? `[${m.media_type}]` : m.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 pt-4 pb-2 flex flex-col gap-4">
        {isLoading ? (
          <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-neutral-500" /></div>
        ) : (
          <>
            <div className="flex flex-col items-center justify-center my-10 gap-2 shrink-0">
              <img src={otherUser?.avatar_url || `https://ui-avatars.com/api/?name=${otherUser?.username}`} className="w-24 h-24 rounded-full object-cover border-2 border-white/10" />
              <span className="text-xl font-bold">{otherUser?.full_name || otherUser?.username}</span>
              <span className="text-neutral-500 text-sm">@{otherUser?.username}</span>
            </div>
            {messages.map((msg, index) => {
              const isMe = msg.sender_id === session?.user?.id
              const showAvatar = !isMe && (index === messages.length - 1 || messages[index + 1].sender_id !== msg.sender_id)
              
              return (
                <div key={msg.id} id={`msg-${msg.id}`} className={`flex w-full gap-2 transition-colors duration-500 rounded-2xl ${isMe ? 'justify-end' : 'justify-start'}`}>
                  {!isMe && (
                    <div className="w-7 shrink-0 flex flex-col justify-end">
                      {showAvatar && (
                        <img 
                          src={otherUser?.avatar_url || `https://ui-avatars.com/api/?name=${otherUser?.username}`} 
                          className="w-7 h-7 rounded-full object-cover select-none"
                          alt=""
                        />
                      )}
                    </div>
                  )}
                  <motion.div 
                    drag="x" 
                    dragConstraints={{ left: 0, right: 0 }} 
                    dragElastic={0.1}
                    onDragEnd={(e, info) => {
                      if (info.offset.x > 50 || info.offset.x < -50) {
                        setReplyingTo(msg)
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setContextMenu({ x: e.clientX, y: e.clientY, message: msg })
                    }}
                    className={`max-w-[75%] px-4 py-2.5 flex flex-col gap-1 cursor-pointer ${
                      isMe ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' : 'bg-neutral-800 text-white rounded-2xl rounded-tl-sm'
                    }`}
                  >
                    {(() => {
                      const replyTo = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null
                      if (!replyTo) return null
                      return (
                        <div 
                          className={`flex flex-col gap-0.5 mb-1 pl-2 border-l-2 cursor-pointer ${isMe ? 'border-white/30 text-white/80' : 'border-white/20 text-white/60'}`}
                          onClick={() => {
                            const target = document.getElementById(`msg-${replyTo.id}`)
                            if (target) {
                              target.scrollIntoView({ behavior: 'smooth', block: 'center' })
                              target.classList.add('bg-white/10')
                              setTimeout(() => target.classList.remove('bg-white/10'), 1000)
                            }
                          }}
                        >
                          <span className="text-[11px] font-bold">{replyTo.sender_id === session?.user?.id ? 'You' : otherUser?.username}</span>
                          <span className="text-[13px] truncate">{replyTo.content || 'Attachment'}</span>
                        </div>
                      )
                    })()}
                    {msg.media_url && (
                      <div className={`mt-1 mb-1 rounded-xl overflow-hidden ${msg.media_type === 'audio' || msg.media_type === 'document' ? 'bg-transparent' : 'bg-black/20'}`}>
                        {msg.media_type === 'audio' ? (
                          <audio src={msg.media_url} controls className="w-[200px] h-10" />
                        ) : msg.media_type === 'document' ? (
                          <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-colors w-full border border-white/10">
                            <FileText className="w-8 h-8 text-orange-400 shrink-0" />
                            <div className="flex flex-col truncate">
                              <span className="text-sm font-semibold truncate">Document</span>
                              <span className="text-xs text-white/50 truncate">Tap to view</span>
                            </div>
                          </a>
                        ) : msg.media_type === 'video' ? (
                          <video src={msg.media_url} controls playsInline className="w-full max-h-[300px] object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        ) : (
                          <img src={msg.media_url} alt="Media" className="w-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        )}
                      </div>
                    )}
                    {msg.content && <p className="text-[15px] leading-[1.3]">{msg.content}</p>}
                    <div className="flex items-center justify-end gap-1.5 mt-0.5 opacity-50">
                      {msg.is_edited && <span className="text-[10px]">(Edited)</span>}
                      <span className="text-[10px] tracking-wide uppercase">{new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                      {/* Seen receipts — only on the last sent message */}
                      {isMe && index === messages.filter(m => m.sender_id === session?.user?.id).length + messages.filter(m => m.sender_id !== session?.user?.id).length - 1 && msg === messages.filter(m => m.sender_id === session?.user?.id).slice(-1)[0] && (
                        <span className={`text-[11px] ${isConversationRead ? 'text-blue-400 opacity-100' : 'opacity-60'}`}>
                          {isConversationRead ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </motion.div>
                </div>
              )
            })}
            <div ref={messagesEndRef} className="h-2 shrink-0" />

            {/* Typing indicator */}
            {isOtherTyping && (
              <div className="flex items-end gap-2 pb-1">
                <img src={otherUser?.avatar_url || `https://ui-avatars.com/api/?name=${otherUser?.username}`} className="w-6 h-6 rounded-full object-cover" alt="" />
                <div className="bg-neutral-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="shrink-0 bg-black border-t border-white/5 z-50" style={{ paddingBottom: isKeyboardOpen ? '12px' : 'calc(16px + env(safe-area-inset-bottom))' }}>
        {showRequestPrompt ? (
          <div className="flex flex-col p-6 gap-4">
            <p className="text-center text-[13px] text-neutral-400 px-4 leading-normal">Accept message request from @{otherUser?.username}? They won't know you've seen it until you accept.</p>
            <div className="flex gap-3">
              <button onClick={handleDeclineRequest} className="flex-1 py-3 rounded-xl font-bold text-[14px] bg-neutral-900 hover:bg-neutral-800 transition-colors text-white">Decline</button>
              <button onClick={handleAcceptRequest} className="flex-1 py-3 rounded-xl font-bold text-[14px] bg-blue-600 hover:bg-blue-500 transition-colors text-white">Accept</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <AnimatePresence>
              {(replyingTo || editingMessage) && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 py-3 bg-neutral-900 border-b border-black flex items-start justify-between gap-2 overflow-hidden"
                >
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[12px] font-bold text-blue-400 flex items-center gap-1">
                      {editingMessage ? <Pencil className="w-3 h-3" /> : <Reply className="w-3 h-3" />} 
                      {editingMessage ? 'Editing message' : `Replying to ${replyingTo?.sender_id === session?.user?.id ? 'yourself' : otherUser?.username}`}
                    </span>
                    <span className="text-[13px] text-neutral-400 truncate mt-0.5">
                      {(editingMessage || replyingTo)?.media_url ? 'Attachment' : (editingMessage || replyingTo)?.content}
                    </span>
                  </div>
                  <button type="button" onClick={() => { setReplyingTo(null); setEditingMessage(null); setNewMessage(''); }} className="p-1 rounded-full bg-neutral-800 hover:bg-neutral-700 shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          <form onSubmit={handleSendMessage} className="px-3 py-3 flex items-center gap-2">
            <div className="flex-1 bg-[#1a1a1a] rounded-full flex items-center pl-1 pr-1 py-1 transition-colors">
              <button type="button" onClick={() => setShowCamera(true)} className="w-[36px] h-[36px] bg-[#4B6BFF] rounded-full text-white shrink-0 flex items-center justify-center shadow-sm">
                <Camera className="w-[18px] h-[18px]" strokeWidth={2.5} />
              </button>
              
              <textarea 
                onClick={forceScrollToBottom} 
                onFocus={forceScrollToBottom} 
                value={newMessage} 
                onChange={(e) => { setNewMessage(e.target.value); broadcastTyping(); }} 
                placeholder="Message..." 
                rows={1} 
                className="flex-1 bg-transparent border-none focus:outline-none text-white py-2 px-3 resize-none text-[15px] max-h-[120px] placeholder:text-neutral-400 placeholder:font-normal font-medium leading-relaxed" 
              />

              {!newMessage.trim() && !isRecording ? (
                <div className="flex items-center gap-1.5 pr-2 shrink-0 text-white">
                  <button type="button" onClick={handleMicClick} className="p-1 hover:bg-white/10 rounded-full transition-colors text-white">
                    <Mic className="w-[22px] h-[22px]" strokeWidth={2} />
                  </button>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50 text-white" disabled={isUploading}>
                    {isUploading ? <Loader2 className="w-[22px] h-[22px] animate-spin" /> : <ImageIcon className="w-[22px] h-[22px]" strokeWidth={2} />}
                  </button>
                  <div className="relative">
                    <button type="button" onClick={() => setShowPlusMenu(!showPlusMenu)} className="p-1 hover:bg-white/10 rounded-full transition-colors text-white">
                      <PlusCircle className="w-[22px] h-[22px]" strokeWidth={2} />
                    </button>
                    <AnimatePresence>
                      {showPlusMenu && (
                        <React.Fragment key="plus-menu">
                          <div className="fixed inset-0 z-40" onClick={() => setShowPlusMenu(false)} />
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full right-0 mb-3 w-48 bg-neutral-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 flex flex-col p-1"
                          >
                            <button type="button" onClick={() => { setShowPlusMenu(false); documentInputRef.current?.click(); }} className="w-full px-3 py-2.5 text-left flex items-center gap-3 text-[14px] font-semibold hover:bg-white/10 transition-colors text-white rounded-lg">
                              <FileText className="w-[18px] h-[18px] text-orange-400" /> Share Document
                            </button>
                            <button type="button" onClick={handleSendLocation} className="w-full px-3 py-2.5 text-left flex items-center gap-3 text-[14px] font-semibold hover:bg-white/10 transition-colors text-white rounded-lg">
                              <MapPin className="w-[18px] h-[18px] text-blue-400" /> Share Location
                            </button>
                          </motion.div>
                        </React.Fragment>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <div className="flex items-center pr-1 shrink-0">
                  {isRecording ? (
                    <button type="button" onClick={handleMicClick} className="px-4 py-1.5 bg-red-500/20 text-red-500 rounded-full font-semibold text-[14px] mr-1 flex items-center gap-2 transition-colors hover:bg-red-500/30">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-[pulse_1s_ease-in-out_infinite]" /> Stop
                    </button>
                  ) : (
                    <button 
                      type="submit" 
                      disabled={isSending} 
                      className="text-white font-bold text-[14px] px-4 py-1.5 hover:text-white transition-colors flex items-center justify-center bg-[#4B6BFF] rounded-full shadow-sm mr-0.5"
                      onMouseDown={(e) => e.preventDefault()}
                      onTouchStart={(e) => e.preventDefault()}
                    >
                      {isSending ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : 'Send'}
                    </button>
                  )}
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,video/*" className="hidden" />
              <input type="file" ref={documentInputRef} onChange={handleDocumentUpload} accept=".pdf,.doc,.docx,.txt,.csv,.rtf,application/pdf,text/plain" className="hidden" />
            </div>
          </form>
          </div>
        )}
      </div>

      <AnimatePresence>
        {contextMenu && (
          <React.Fragment key="context-menu">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100]" 
              onClick={() => setContextMenu(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed z-[101] bg-neutral-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl py-1 w-48"
              style={{ left: Math.min(contextMenu.x, window.innerWidth - 200), top: Math.min(contextMenu.y, window.innerHeight - 100) }}
            >
              <button 
                className="w-full text-left px-4 py-3 hover:bg-white/10 flex items-center gap-3 text-sm font-semibold transition-colors"
                onClick={() => {
                  setReplyingTo(contextMenu.message)
                  setContextMenu(null)
                }}
              >
                <Reply className="w-4 h-4" />
                Reply
              </button>
              <button 
                className="w-full text-left px-4 py-3 hover:bg-white/10 flex items-center gap-3 text-sm font-semibold transition-colors"
                onClick={() => handleTogglePinMessage(contextMenu.message)}
              >
                {contextMenu.message.is_pinned ? (
                  <><PinOff className="w-4 h-4 text-blue-400" /> Unpin Message</>
                ) : (
                  <><Pin className="w-4 h-4 text-blue-400" /> Pin Message</>
                )}
              </button>
              {contextMenu.message.sender_id === session?.user?.id && (
                <>
                  {(Date.now() - new Date(contextMenu.message.created_at).getTime() < 15 * 60 * 1000) && !contextMenu.message.media_url && (
                    <button 
                      className="w-full text-left px-4 py-3 hover:bg-white/10 flex items-center gap-3 text-sm font-semibold transition-colors text-blue-400 border-t border-white/5"
                      onClick={() => {
                        setEditingMessage(contextMenu.message)
                        setNewMessage(contextMenu.message.content)
                        setContextMenu(null)
                      }}
                    >
                      <Pencil className="w-4 h-4" /> Edit
                    </button>
                  )}
                  <button 
                    className="w-full text-left px-4 py-3 hover:bg-red-500/10 flex items-center gap-3 text-sm font-semibold transition-colors text-red-500 border-t border-white/5"
                    onClick={() => handleUnsend(contextMenu.message)}
                  >
                    <Trash2 className="w-4 h-4" /> Unsend
                  </button>
                </>
              )}
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCamera && (
          <CameraModal 
            onClose={() => setShowCamera(false)}
            onCapture={async (blob) => {
              setShowCamera(false)
              await uploadAndSendMedia(blob, 'image', 'jpg')
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
