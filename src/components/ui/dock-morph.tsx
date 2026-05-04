import * as React from "react"
import { cn } from "../../lib/utils"
import { Button } from "./button"

import { motion, AnimatePresence } from "framer-motion"
import { Home, Search, PlusSquare, Heart, User } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface DockMorphProps {
  className?: string
  items?: {
    icon: React.ComponentType<{ className?: string, strokeWidth?: number }>
    label: string
    onClick?: () => void
    isActive?: boolean
    hasNotification?: boolean
  }[]
  position?: "bottom" | "top" | "left"
}

export function DockMorph({ items, className, position = "bottom" }: DockMorphProps) {
  const [hovered, setHovered] = React.useState<number | null>(null)
  const navigate = useNavigate()

  const dockItems =
    items && items.length > 0
      ? items
      : [
          { icon: Home, label: "Home", isActive: true, onClick: () => navigate("/") },
          { icon: Search, label: "Explore", onClick: () => console.log("Search") },
          { icon: PlusSquare, label: "Create", onClick: () => console.log("Create") },
          { icon: Heart, label: "Activity", onClick: () => console.log("Activity") },
          { icon: User, label: "Profile", onClick: () => console.log("Profile") },
        ]

  // Position classes
  const positionClasses = {
    bottom: "fixed bottom-6 left-1/2 -translate-x-1/2",
    top: "fixed top-6 left-1/2 -translate-x-1/2",
    left: "fixed left-6 top-1/2 -translate-y-1/2 flex-col",
  }

  return (
    <div
      className={cn(
        "z-50 flex items-center justify-center",
        positionClasses[position],
        className
      )}
    >
      <div
        className={cn(
          "relative flex items-center gap-2 p-2 rounded-full",
          position === "left" ? "flex-col gap-4 px-4 py-8" : "flex-row",
          "bg-black/60 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 ring-1 ring-white/5"
        )}
      >
        {dockItems.map((item, i) => (
          <div key={item.label} className="relative">
            <div 
              className="relative flex items-center justify-center cursor-pointer"
              onPointerEnter={() => setHovered(i)}
              onPointerLeave={() => setHovered(null)}
              onPointerCancel={() => setHovered(null)}
              onPointerUp={() => {
                // Clear the hover state on touch devices right after interaction
                setTimeout(() => setHovered(null), 150)
              }}
              onClick={(e) => {
                item.onClick?.()
              }}
            >
              {/* Morphic glass bubble */}
              <AnimatePresence>
                {hovered === i && (
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1.4, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 20,
                    }}
                    className={cn(
                      "absolute inset-0 rounded-full pointer-events-none",
                      "bg-gradient-to-tr from-white/20 via-white/10 to-transparent",
                      "backdrop-blur-3xl",
                      "shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                    )}
                  />
                )}
              </AnimatePresence>

              {/* Icon button */}
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center rounded-full transition-transform duration-300 h-9 w-9",
                  item.isActive ? "text-white" : "text-neutral-400 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5" strokeWidth={item.isActive ? 2.5 : 2} />
                {item.hasNotification && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full border border-black" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
