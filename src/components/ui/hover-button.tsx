"use client"

import * as React from "react"
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface HoverButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

const HoverButton = React.forwardRef<HTMLButtonElement, HoverButtonProps>(
  ({ className, children, ...props }, ref) => {
    const buttonRef = React.useRef<HTMLButtonElement>(null)
    const [position, setPosition] = React.useState({ x: 0, y: 0 })
    const [opacity, setOpacity] = React.useState(0)

    const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!buttonRef.current) return
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }

    const handlePointerEnter = () => setOpacity(1)
    const handlePointerLeave = () => setOpacity(0)

    return (
      <button
        ref={buttonRef}
        className={cn(
          "relative overflow-hidden rounded-full px-6 py-2.5 text-sm font-medium text-white/90",
          "border border-white/10 bg-white/5 transition-colors hover:bg-white/10 active:scale-95",
          className
        )}
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        {...props}
      >
        <div
          className="pointer-events-none absolute -inset-px transition-opacity duration-300"
          style={{
            opacity,
            background: `radial-gradient(120px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.15), transparent 80%)`,
          }}
        />
        <span className="relative z-10 flex items-center justify-center">{children}</span>
      </button>
    )
  }
)

HoverButton.displayName = "HoverButton"

export { HoverButton }
