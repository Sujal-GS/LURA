import { create } from 'zustand'

interface ChatState {
  typingUsers: Record<string, string[]> // conversationId -> usernames[]
  setTyping: (conversationId: string, username: string, isTyping: boolean) => void
  activeReply: { messageId: string, content: string, username: string } | null
  setActiveReply: (reply: { messageId: string, content: string, username: string } | null) => void
}

export const useChatStore = create<ChatState>((set) => ({
  typingUsers: {},
  setTyping: (conversationId, username, isTyping) => set((state) => {
    const current = state.typingUsers[conversationId] || []
    const updated = isTyping 
      ? [...new Set([...current, username])]
      : current.filter(u => u !== username)
    return {
      typingUsers: { ...state.typingUsers, [conversationId]: updated }
    }
  }),
  activeReply: null,
  setActiveReply: (reply) => set({ activeReply: reply }),
}))
