'use client'

import { usePathname } from 'next/navigation'
import Nav from './nav'
import NavOverlay from '../components/NavOverlay'
import TopGallery from '../components/TopGallery'
import BottomGallery from '../components/BottomGallery'
import ProjectInfo from '../components/ProjectInfo'
import { GalleryProvider } from '../components/GalleryContext'

export default function ClientLayout({ children, initialData }) {
  const pathname = usePathname()
  const isStudioPage = pathname?.startsWith('/studio')
  const isHomePage = pathname === '/'
  
  return (
    <>
      {/* Navigation with integrated path awareness */}
      <Nav />
      
      {/* Navigation Overlay - positioned outside the nav component */}
      <NavOverlay />
      
      {/* Render GalleryProvider and ProjectInfo when not on Sanity Studio pages */}
      {!isStudioPage && (
        <GalleryProvider initialData={initialData}>
          {/* Only render galleries on the homepage */}
          {isHomePage && (
            <>
              <TopGallery />
              <BottomGallery />
              <ProjectInfo />
            </>
          )}
        </GalleryProvider>
      )}
      
      {/* Main Content */}
      <main>
        {children}
      </main>
    </>
  )
} 