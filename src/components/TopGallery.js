'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useGalleryContext } from './GalleryContext'
import { useRef, useEffect } from 'react'

export default function TopGallery() {
  const { projects, hoveredProject, handleProjectHover, handleProjectLeave, registerTopGallery } = useGalleryContext()
  const scrollContainerRef = useRef(null)
  const galleryRef = useRef(null)

  // Register this gallery's scroll container with the context
  useEffect(() => {
    if (galleryRef.current) {
      registerTopGallery(galleryRef.current);
    }
  }, [registerTopGallery]);

  // No need for individual wheel handler as it's now handled by GalleryContext

  if (!projects.imageProjects || projects.imageProjects.length === 0) {
    return <div className="top-gallery absolute left-0 right-0 px-2.5 z-[9]"></div>
  }
  
  return (
    <div ref={galleryRef} className="top-gallery absolute left-0 right-0 px-2.5 z-[9] mt-5 md:mt-0">
      <div 
        ref={scrollContainerRef} 
        className="w-full overflow-x-auto overflow-y-hidden scrollbar-hide"
        style={{ 
          scrollbarWidth: 'none',  /* Firefox */
          msOverflowStyle: 'none',  /* IE and Edge */
        }}
      >
        <div className="flex gap-2">
          {projects.imageProjects.map((project) => (
            <Link 
              href={`/project/${project.slug}`}
              key={project._id}
              className="w-[200px] h-[200px] flex-shrink-0 relative"
              onMouseEnter={() => handleProjectHover(project)}
              onMouseLeave={handleProjectLeave}
            >
              <div className="relative w-full h-full">
                {project.coverImage && (
                  <Image
                    src={project.coverImage}
                    alt={project.name}
                    width={200}
                    height={200}
                    className="w-full h-full object-cover transition-opacity duration-300 ease-in-out"
                    style={{ 
                      opacity: hoveredProject === project ? 0.3 : 1 
                    }}
                  />
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
      {/* <div className="mt-2 text-left">
        Stills
      </div> */}
    </div>
  )
} 