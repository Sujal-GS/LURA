import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Edit, Search, MessageCircle, MoreHorizontal, Pin, PinOff, Trash2, Loader2 } from 'lucide-react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import { NewMessageModal } from '../components/NewMessageModal'
import { timeAgo } from '../lib/utils'

export type Conversation = {
  id: string
  user1_id: string
  user2_id: string
  status: 'pending' | 'accepted'
  last_message: string
  last_message_at: string
  updated_at: string
  last_message_sender_id: string
  is_read: boolean
  is_pinned?: boolean
  pinned_at?: string
  user1: any
  user2: any
}

export default function MessagesList() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { setIsDockVisible } = useOutletContext<{ setIsDockVisible: (v: boolean) => void }>()
  const [activeTab, setActiveTab] = useState<'primary' | 'requests'>('primary')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, conversation: Conversation } | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<Conversation | null>(null)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)

  useEffect(() => {
    setIsDockVisible(false)
    return () => setIsDockVisible(true)
  }, [setIsDockVisible])

  const fetchConversations = async () => {
    if (!session?.user?.id) return
    setIsLoading(true)
    
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // We fetch conversations where the user is either user1 or user2
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        user1:profiles!user1_id(*),
        user2:profiles!user2_id(*)
      `)
      .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching conversations', error)
    } else if (data) {
      setConversations(data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchConversations()

    // Subscribe to conversation updates
    const channel = supabase
      .channel('conversations-list')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'conversations'
      }, () => {
        fetchConversations()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session?.user?.id])

  const getOtherUser = (conv: Conversation) => {
    return conv.user1_id === session?.user?.id ? conv.user2 : conv.user1
  }

  const isRequest = (conv: Conversation) => {
    // If it's accepted, it's in Primary
    if (conv.status !== 'pending') return false
    
    // If it's pending but WE sent the last message, it means we initiated it, so it stays in our Primary list
    if (conv.last_message_sender_id === session?.user?.id) return false
    
    // Otherwise, they sent it and we haven't accepted it yet, so it's a request
    return true
  }

  const primaryConversations = conversations.filter(c => !isRequest(c))
  const requestConversations = conversations.filter(c => isRequest(c))

  const displayedConversations = activeTab === 'primary' ? primaryConversations : requestConversations

  // Client-side search filter (fast for already-loaded conversations)
  const filteredConversations = searchQuery.trim() === '' 
    ? displayedConversations
    : displayedConversations.filter(c => {
        const otherUser = getOtherUser(c)
        const q = searchQuery.toLowerCase()
        return otherUser?.username?.toLowerCase().includes(q) || 
               otherUser?.full_name?.toLowerCase().includes(q) ||
               c.last_message?.toLowerCase().includes(q)
      })

  const handleTogglePin = async (conv: Conversation) => {
    setContextMenu(null)
    const newPinnedStatus = !conv.is_pinned
    
    // Limit to 3 pinned chats
    if (newPinnedStatus && primaryConversations.filter(c => c.is_pinned).length >= 3) {
      alert("You can only pin up to 3 conversations.")
      return
    }

    const { error } = await supabase
      .from('conversations')
      .update({ 
        is_pinned: newPinnedStatus,
        pinned_at: newPinnedStatus ? new Date().toISOString() : null
      })
      .eq('id', conv.id)

    if (error) {
      console.error('Error toggling pin', error)
    } else {
      fetchConversations()
    }
  }

  const handleDeleteChat = async (conv: Conversation) => {
    // Don't close modal yet — keep it open so the spinner shows
    setIsDeletingId(conv.id)

    try {
      // 1. Best-effort storage cleanup for any media in the chat
      const { data: mediaMsgs } = await supabase
        .from('messages')
        .select('media_url')
        .eq('conversation_id', conv.id)
        .not('media_url', 'is', null)

      if (mediaMsgs && mediaMsgs.length > 0) {
        const paths = mediaMsgs
          .map(m => m.media_url.split('/object/public/messages/').pop() || m.media_url.split('/messages/').pop())
          .filter(Boolean) as string[]
        if (paths.length > 0) {
          await supabase.storage.from('messages').remove(paths.map(decodeURIComponent))
        }
      }

      // 2. Delete all messages in the conversation first
      const { error: msgError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conv.id)

      if (msgError) {
        console.error('Error deleting messages:', msgError)
        throw msgError
      }

      // 3. Delete the conversation itself
      const { error: convError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conv.id)

      if (convError) {
        console.error('Error deleting conversation:', convError)
        throw convError
      }

      // Successfully deleted — remove from UI now
      setConversations(prev => prev.filter(c => c.id !== conv.id))
    } catch (err) {
      console.error('Delete chat failed, reverting UI:', err)
      fetchConversations()
    } finally {
      setIsDeletingId(null)
      setDeleteConfirmation(null) // Close modal after spinner is done
    }
  }

  return (
    <div className="w-full flex-1 flex flex-col bg-black text-white relative overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 py-3 shrink-0" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">{session?.user?.user_metadata?.username || 'Messages'}</h1>
        </div>
        <button onClick={() => setIsNewMessageOpen(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <Edit className="w-5 h-5" />
        </button>
      </header>

      {/* Search */}
      <div className="px-4 py-3 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input 
            type="text" 
            placeholder="Search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/10 border-none rounded-full py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-4 gap-6 font-semibold text-sm border-b border-white/5 shrink-0">
        <button 
          onClick={() => setActiveTab('primary')}
          className={`py-3 relative ${activeTab === 'primary' ? 'text-white' : 'text-neutral-500 hover:text-white/80'}`}
        >
          Primary
          {activeTab === 'primary' && (
            <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-t-full" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('requests')}
          className={`py-3 relative ${activeTab === 'requests' ? 'text-white' : 'text-neutral-500 hover:text-white/80'}`}
        >
          Requests {requestConversations.length > 0 && `(${requestConversations.length})`}
          {activeTab === 'requests' && (
            <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-t-full" />
          )}
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center p-10">
            <div className="w-6 h-6 border-2 border-neutral-500 border-t-white rounded-full animate-spin" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-neutral-500 text-center">
            <div className="w-16 h-16 rounded-full border-2 border-neutral-800 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8" />
            </div>
            <p className="font-medium text-white mb-1">No messages found</p>
            <p className="text-sm">Start a new conversation</p>
          </div>
        ) : (
          filteredConversations.map(conv => {
            const otherUser = getOtherUser(conv)
            if (!otherUser) return null
            
            const isUnread = conv.last_message_sender_id !== session?.user?.id && !conv.is_read
            const wasSentByMe = conv.last_message_sender_id === session?.user?.id

            return (
              <div 
                key={conv.id} 
                onClick={() => {
                  if (!contextMenu) navigate(`/messages/${conv.id}`)
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setContextMenu({ x: e.clientX, y: e.clientY, conversation: conv })
                }}
                onPointerDown={(e) => {
                  const timer = setTimeout(() => {
                    setContextMenu({ x: e.clientX, y: e.clientY, conversation: conv })
                  }, 500)
                  e.currentTarget.setAttribute('data-timer', timer.toString())
                }}
                onPointerUp={(e) => {
                  const timer = e.currentTarget.getAttribute('data-timer')
                  if (timer) clearTimeout(parseInt(timer))
                }}
                onPointerLeave={(e) => {
                  const timer = e.currentTarget.getAttribute('data-timer')
                  if (timer) clearTimeout(parseInt(timer))
                }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer active:bg-white/10 relative select-none"
              >
                <div className="relative shrink-0">
                  <img 
                    src={otherUser.avatar_url || `https://ui-avatars.com/api/?name=${otherUser.username}`} 
                    alt={otherUser.username}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  {conv.is_pinned && (
                    <div className="absolute -top-1 -right-1 bg-neutral-900 rounded-full p-1 border border-white/10 shadow-lg">
                      <Pin className="w-3 h-3 text-white fill-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className={`text-[15px] truncate ${isUnread ? 'font-bold text-white' : 'font-semibold text-white/90'}`}>
                      {otherUser.full_name || otherUser.username}
                    </span>
                    <span className={`text-xs shrink-0 ml-2 ${isUnread ? 'text-white font-bold' : 'text-neutral-500'}`}>
                      {conv.last_message_at ? timeAgo(conv.last_message_at) : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <p className={`text-sm truncate pr-4 ${isUnread ? 'text-white font-bold' : 'text-neutral-400'}`}>
                      {wasSentByMe ? `You: ${conv.last_message}` : conv.last_message || 'Started a chat'}
                    </p>
                    {isUnread && (
                      <div className="w-2.5 h-2.5 bg-white rounded-full shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <AnimatePresence>
        {contextMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/20"
              onClick={() => setContextMenu(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed z-[70] bg-neutral-900 border border-white/10 rounded-2xl p-1.5 shadow-2xl min-w-[160px] overflow-hidden"
              style={{ 
                left: Math.min(contextMenu.x, window.innerWidth - 180), 
                top: Math.min(contextMenu.y, window.innerHeight - 100) 
              }}
            >
              <button 
                className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 text-sm font-semibold transition-colors rounded-xl"
                onClick={() => handleTogglePin(contextMenu.conversation)}
              >
                {contextMenu.conversation.is_pinned ? (
                  <><PinOff className="w-4 h-4" /> Unpin</>
                ) : (
                  <><Pin className="w-4 h-4" /> Pin</>
                )}
              </button>
              <button 
                className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 text-sm font-semibold transition-colors rounded-xl"
                onClick={() => {
                  setContextMenu(null)
                  navigate(`/messages/${contextMenu.conversation.id}`)
                }}
              >
                <MessageCircle className="w-4 h-4" /> Open Chat
              </button>
              <button 
                className="w-full text-left px-4 py-3 hover:bg-red-500/10 flex items-center gap-3 text-sm font-semibold transition-colors text-red-500 rounded-xl border-t border-white/5"
                onClick={() => {
                  setContextMenu(null)
                  setDeleteConfirmation(contextMenu.conversation)
                }}
              >
                <Trash2 className="w-4 h-4" /> Delete Chat
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>


      <NewMessageModal 
        isOpen={isNewMessageOpen} 
        onClose={() => setIsNewMessageOpen(false)} 
        onChatStart={(conversationId) => {
          setIsNewMessageOpen(false)
          navigate(`/messages/${conversationId}`)
        }}
      />

      <AnimatePresence>
        {deleteConfirmation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDeleteConfirmation(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-neutral-900 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 mx-auto">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-center mb-2">Delete Chat?</h2>
              <p className="text-neutral-400 text-center text-sm mb-6">
                Are you sure you want to delete this conversation? This action cannot be undone and all messages will be permanently removed.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmation(null)}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDeleteChat(deleteConfirmation)}
                  disabled={isDeletingId === deleteConfirmation?.id}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isDeletingId === deleteConfirmation?.id ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
                  ) : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
