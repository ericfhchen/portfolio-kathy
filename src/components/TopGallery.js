'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useGalleryContext } from './GalleryContext'
import { useRef, useEffect, useState } from 'react'

export default function TopGallery() {
  const { projects, hoveredProject, handleProjectHover, handleProjectLeave, registerTopGallery } = useGalleryContext()
  const scrollContainerRef = useRef(null)
  const galleryRef = useRef(null)
  const itemRefs = useRef({})
  const [visibleIds, setVisibleIds] = useState(new Set())
  const [loadedIds, setLoadedIds] = useState(new Set())

  // Register this gallery's scroll container with the context
  useEffect(() => {
    if (galleryRef.current) {
      registerTopGallery(galleryRef.current);
    }
  }, [registerTopGallery]);

  // Phase 2: IntersectionObserver for viewport-aware image loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleIds(prev => {
          const next = new Set(prev);
          entries.forEach(entry => {
            const id = entry.target.dataset.projectId;
            if (entry.isIntersecting) {
              next.add(id);
            }
            // Don't remove — once loaded, keep the image
          });
          if (next.size === prev.size) return prev;
          return next;
        });
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '0px 300px 0px 300px',
        threshold: 0,
      }
    );

    Object.values(itemRefs.current).forEach(el => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [projects.imageProjects]);

  if (!projects.imageProjects || projects.imageProjects.length === 0) {
    return <div className="top-gallery absolute left-0 right-0 px-2.5 z-[9]"></div>
  }

  return (
    <div ref={galleryRef} className="top-gallery absolute left-0 right-0 px-2.5 z-[9] mt-5 md:mt-0">
      <div
        ref={scrollContainerRef}
        className="w-full overflow-x-auto overflow-y-hidden scrollbar-hide"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <div className="flex gap-2">
          {projects.imageProjects.map((project) => {
            const isVisible = visibleIds.has(project._id);

            return (
              <Link
                href={`/project/${project.slug}`}
                key={project._id}
                ref={el => { if (el) itemRefs.current[project._id] = el; }}
                data-project-id={project._id}
                className="w-[calc(40vw-20px)] h-[calc(40vw-20px)] md:w-[200px] md:h-[200px] flex-shrink-0 relative"
                onMouseEnter={() => handleProjectHover(project)}
                onMouseLeave={handleProjectLeave}
              >
                <div
                  className="relative w-full h-full"
                  style={project.coverImageBlur && !loadedIds.has(project._id) ? {
                    backgroundImage: `url(${project.coverImageBlur})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  } : undefined}
                >
                  {project.coverImage && isVisible ? (
                    <Image
                      src={project.coverImage}
                      alt={project.name}
                      width={200}
                      height={200}
                      sizes="(max-width: 768px) 40vw, 200px"
                      className="w-full h-full object-cover transition-opacity duration-300 ease-in-out"
                      style={{
                        opacity: hoveredProject === project ? 0.3 : 1,
                        willChange: 'opacity',
                        transform: 'translateZ(0)',
                      }}
                      onLoad={() => setLoadedIds(prev => new Set([...prev, project._id]))}
                    />
                  ) : (
                    <div className="w-full h-full" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      <div className="mt-2 text-left md:hidden">
        Stills
      </div>
    </div>
  )
}
