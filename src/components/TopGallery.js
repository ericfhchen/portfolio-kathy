'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useGalleryContext } from './GalleryContext'

export default function TopGallery() {
  const { projects, hoveredProject, handleProjectHover, handleProjectLeave } = useGalleryContext()

  if (!projects.imageProjects) return null
  
  return (
    <div className="top-gallery absolute left-0 right-0 px-2.5 z-[9]">
      <div className="w-full overflow-x-auto overflow-y-hidden">
        <div className="flex gap-2">
          {projects.imageProjects.map((project) => (
            <Link 
              href={`/image-project/${project.slug}`}
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
    </div>
  )
} 