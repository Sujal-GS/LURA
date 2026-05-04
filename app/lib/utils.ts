import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date string into a "time ago" string
 */
export const timeAgo = (dateString: string): string => {
  const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000)
  let interval = seconds / 3600
  if (interval > 24) return Math.floor(interval / 24) + ' DAYS AGO'
  if (interval >= 1) return Math.floor(interval) + ' HOURS AGO'
  interval = seconds / 60
  if (interval >= 1) return Math.floor(interval) + ' MINUTES AGO'
  return 'JUST NOW'
}
