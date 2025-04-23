'use client'

import { useGalleryContext } from './GalleryContext'

export default function ProjectInfo() {
  const { hoveredProject } = useGalleryContext()

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[50]">
      <div className={`text-center transition-opacity duration-300 ${hoveredProject ? 'opacity-100' : 'opacity-0'}`}>
        {hoveredProject && (
          <>
            {hoveredProject.client && (
              <div>{hoveredProject.client.title}</div>
            )}
            {hoveredProject.projectTagline && (
              <div>{hoveredProject.projectTagline}</div>
            )}
          </>
        )}
      </div>
    </div>
  )
} 