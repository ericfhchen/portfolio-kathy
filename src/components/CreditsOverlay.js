'use client'

import { useState, useEffect } from 'react'

export default function CreditsOverlay({ credits }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile on mount and when window resizes
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    // Set initial state
    checkMobile()
    
    // Update on resize
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close overlay when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setIsOpen(false)
    }
  }, [isMobile])

  if (!isMobile) {
    // On desktop, just render the credits normally
    return (
      <div className="fixed bottom-0 left-0 p-2.5 max-w-xs z-10">
        <div>
          <div className="uppercase mb-1">Credits</div>
          <div className="prose">
            <div dangerouslySetInnerHTML={{ 
              __html: Array.isArray(credits) 
                ? credits.map(block => block.children?.map(child => child.text).join(' ')).join('<br />') 
                : '' 
            }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Credits toggle button */}
      <button 
        className="fixed bottom-0 left-0 z-30 p-2.5 leading-[1]"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '(CLOSE)' : 'Credits'}
      </button>

      {/* Credits overlay */}
      {isOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-[rgba(239,239,239,0.8)] backdrop-blur-[40px] p-2.5 pb-16 max-h-[80vh] overflow-y-auto">
          <div className="prose max-w-none">
            <div className="uppercase mb-2">Credits</div>
            <div dangerouslySetInnerHTML={{ 
              __html: Array.isArray(credits) 
                ? credits.map(block => block.children?.map(child => child.text).join(' ')).join('<br />') 
                : '' 
            }} />
          </div>
        </div>
      )}
    </>
  )
} 