import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "../../lib/utils"

const TooltipProvider = ({ children, delayDuration = 200 }: any) => <>{children}</>

const TooltipContext = React.createContext<{ isOpen: boolean; setIsOpen: (v: boolean) => void }>({
  isOpen: false,
  setIsOpen: () => {},
})

const Tooltip = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  return <TooltipContext.Provider value={{ isOpen, setIsOpen }}>{children}</TooltipContext.Provider>
}

const TooltipTrigger = React.forwardRef<HTMLDivElement, any>(({ asChild, children, onMouseEnter, onMouseLeave, ...props }, ref) => {
  const { setIsOpen } = React.useContext(TooltipContext)
  
  return (
    <div
      ref={ref}
      className="inline-block"
      onMouseEnter={(e) => {
        setIsOpen(true)
        if (onMouseEnter) onMouseEnter(e)
      }}
      onMouseLeave={(e) => {
        setIsOpen(false)
        if (onMouseLeave) onMouseLeave(e)
      }}
      {...props}
    >
      {children}
    </div>
  )
})
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef<HTMLDivElement, any>(({ className, side = "top", children, ...props }, ref) => {
  const { isOpen } = React.useContext(TooltipContext)
  
  const sideStyles = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.95, y: side === 'top' ? 5 : side === 'bottom' ? -5 : 0, x: side === 'left' ? 5 : side === 'right' ? -5 : 0 }}
          animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className={cn(
            "absolute z-50 px-3 py-1.5 text-xs font-medium text-white bg-neutral-800 border border-white/10 rounded-md shadow-md whitespace-nowrap pointer-events-none",
            sideStyles[side as keyof typeof sideStyles],
            className
          )}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
})
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
