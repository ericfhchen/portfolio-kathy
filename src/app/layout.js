'use client'

import './globals.css'
import Nav from './nav'
import NavOverlay from '../components/NavOverlay'
import TopGallery from '../components/TopGallery'
import BottomGallery from '../components/BottomGallery'
import ProjectInfo from '../components/ProjectInfo'
import { GalleryProvider } from '../components/GalleryContext'
import { usePathname } from 'next/navigation'

export default function RootLayout({ children }) {
  const pathname = usePathname()
  const isStudioPage = pathname?.startsWith('/studio')
  const isHomePage = pathname === '/'
  
  return (
    <html lang="en">
      <body className="p-2.5 h-svh overflow-hidden">
        {/* Navigation with integrated path awareness */}
        <Nav />
        
        {/* Navigation Overlay - positioned outside the nav component */}
        <NavOverlay />
        
        {/* Render GalleryProvider and ProjectInfo when not on Sanity Studio pages */}
        {!isStudioPage && (
          <GalleryProvider>
            {/* Only render galleries on the homepage */}
            {isHomePage && (
              <>
                <TopGallery />
                <BottomGallery />
              </>
            )}
            <ProjectInfo />
          </GalleryProvider>
        )}
        
        {/* Main Content */}
        <main>
          {children}
        </main>
      </body>
    </html>
  )
} 