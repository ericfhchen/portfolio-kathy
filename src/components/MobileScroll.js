'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function MobileScroll() {
  const pathname = usePathname()
  const isImageProject = pathname?.includes('/image-project/')
  
  useEffect(() => {
    if (!isImageProject) return
    
    // Function to update body style based on window width
    const updateBodyStyle = () => {
      if (window.innerWidth < 768) { // mobile breakpoint (adjust as needed)
        document.body.style.overflow = 'auto'
        document.body.style.height = 'auto'
      } else {
        // Reset to original styles for desktop
        document.body.style.overflow = 'hidden'
        document.body.style.height = 'svh'
      }
    }
    
    // Set initial style
    updateBodyStyle()
    
    // Update on resize
    window.addEventListener('resize', updateBodyStyle)
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', updateBodyStyle)
      
      // Reset body styles when navigating away
      document.body.style.overflow = 'hidden'
      document.body.style.height = 'svh'
    }
  }, [isImageProject])
  
  return null // This component doesn't render anything
} 