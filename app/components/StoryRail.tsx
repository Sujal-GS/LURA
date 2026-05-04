import React from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { type StoryGroup } from './StoryViewer'

interface StoryRailProps {
  storyGroups: StoryGroup[]
  onStoryClick: (index: number) => void
  onAddStoryClick: () => void
  viewedStories: Record<string, string>
  currentUserProfile: any
}

export function StoryRail({ 
  storyGroups, 
  onStoryClick,
  onAddStoryClick,
  viewedStories,
  currentUserProfile
}: StoryRailProps) {
  const { session } = useAuth()
  const userAvatar = currentUserProfile?.avatar_url || session?.user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${session?.user?.email}`

  const currentUserGroupIdx = storyGroups.findIndex(g => g.user_id === session?.user?.id)
  const currentUserGroup = currentUserGroupIdx !== -1 ? storyGroups[currentUserGroupIdx] : null

  const isGroupViewed = (group: StoryGroup | null) => {
    if (!group) return true
    const latestStory = group.stories[group.stories.length - 1]
    const viewedAt = viewedStories[group.user_id]
    return viewedAt && new Date(viewedAt) >= new Date(latestStory.created_at)
  }

  const currentUserViewed = isGroupViewed(currentUserGroup)

  return (
    <div className="w-full overflow-x-auto scrollbar-hide py-4 px-2 border-b border-white/5">
      <div className="flex gap-4 px-2">
        
        {/* Current User Story Button */}
        <div className="flex flex-col items-center gap-1 cursor-pointer group shrink-0">
          <div className={`relative p-[2px] rounded-full ${currentUserGroup && !currentUserViewed ? 'bg-gradient-to-tr from-rose-500 via-fuchsia-500 to-indigo-500' : 'bg-white/20'}`}>
            <div 
              className="bg-[#050505] p-[2px] rounded-full"
              onClick={() => currentUserGroup ? onStoryClick(currentUserGroupIdx) : onAddStoryClick()}
            >
              <img 
                src={currentUserGroup?.avatar_url || userAvatar} 
                alt="Your story" 
                className={`w-16 h-16 rounded-full object-cover group-hover:scale-95 transition-transform duration-300 ${!currentUserGroup ? 'opacity-60' : ''}`}
              />
            </div>
            <div 
              onClick={(e) => {
                e.stopPropagation()
                onAddStoryClick()
              }}
              className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-1 border-2 border-[#050505] hover:scale-110 transition-transform"
            >
              <Plus className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          </div>
          <span className="text-[11px] font-medium text-neutral-300 truncate w-16 text-center">
            Your story
          </span>
        </div>

        {/* Other Users' Stories */}
        {storyGroups.map((group, idx) => {
          if (group.user_id === session?.user?.id) return null;
          
          const hasViewed = isGroupViewed(group)
          
          return (
            <div key={group.user_id} onClick={() => onStoryClick(idx)} className="flex flex-col items-center gap-1 cursor-pointer group shrink-0">
              <div className={`relative p-[2px] rounded-full ${hasViewed ? 'bg-white/20' : 'bg-gradient-to-tr from-rose-500 via-fuchsia-500 to-indigo-500'}`}>
                <div className="bg-[#050505] p-[2px] rounded-full">
                  <img 
                    src={group.avatar_url || `https://ui-avatars.com/api/?name=${group.username}`} 
                    alt={group.username} 
                    className="w-16 h-16 rounded-full object-cover group-hover:scale-95 transition-transform duration-300"
                  />
                </div>
              </div>
              <span className="text-[11px] font-medium text-neutral-300 truncate w-16 text-center">
                {group.username}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
