'use client'

import { createContext, useState, useEffect, useContext, useRef } from 'react'
import { client } from '../sanity/lib/client'
import { groq } from 'next-sanity'
import { usePathname } from 'next/navigation'

// Create context
export const GalleryContext = createContext(null)

// Custom hook to use the gallery context
export function useGalleryContext() {
  return useContext(GalleryContext)
}

// Provider component — accepts optional initialData from server-side fetch
export function GalleryProvider({ children, initialData }) {
  const [projects, setProjects] = useState(
    initialData || { imageProjects: [], videoProjects: [] }
  )
  const [loading, setLoading] = useState(!initialData)
  const [hoveredProject, setHoveredProject] = useState(null)
  const topGalleryRef = useRef(null);
  const bottomGalleryRef = useRef(null);
  const pathname = usePathname();

  // Reset hover state when navigating back to home page
  useEffect(() => {
    setHoveredProject(null);
  }, [pathname]);

  // Register refs for galleries to enable global wheel event handling
  const registerTopGallery = (ref) => {
    topGalleryRef.current = ref;
  };

  const registerBottomGallery = (ref) => {
    bottomGalleryRef.current = ref;
  };

  // Global wheel event handler
  useEffect(() => {
    const findScrollContainer = (galleryRef) => {
      if (!galleryRef) return null;

      const directScrollContainer = Array.from(galleryRef.children)
        .find(child =>
          child.classList &&
          (child.classList.contains('overflow-x-auto') ||
           child.classList.contains('scrollbar-hide'))
        );

      if (directScrollContainer) return directScrollContainer;

      return galleryRef.querySelector('.overflow-x-auto') ||
             galleryRef.querySelector('.scrollbar-hide');
    };

    const handleGlobalWheel = (e) => {
      if (e.ctrlKey) return;

      if (topGalleryRef.current && (
          topGalleryRef.current === e.target ||
          topGalleryRef.current.contains(e.target))) {
        e.preventDefault();

        const scrollContainer = findScrollContainer(topGalleryRef.current);

        if (scrollContainer) {
          const scrollDelta = e.deltaX || e.deltaY * 1.5;
          scrollContainer.scrollLeft += scrollDelta;
        }
        return;
      }

      if (bottomGalleryRef.current && (
          bottomGalleryRef.current === e.target ||
          bottomGalleryRef.current.contains(e.target))) {
        e.preventDefault();

        const scrollContainer = findScrollContainer(bottomGalleryRef.current);

        if (scrollContainer) {
          const scrollDelta = e.deltaX || e.deltaY * 1.5;
          scrollContainer.scrollLeft += scrollDelta;
        }
        return;
      }
    };

    if (pathname !== '/') return;

    window.addEventListener('wheel', handleGlobalWheel, { passive: false, capture: true });

    return () => {
      window.removeEventListener('wheel', handleGlobalWheel, { capture: true });
    };
  }, [pathname]);

  // Phase 3: Only fetch client-side if no initialData was provided
  useEffect(() => {
    if (initialData) return;

    async function fetchProjects() {
      try {
        const [imageProjects, videoProjects, muxAssets] = await Promise.all([
          client.fetch(groq`
            *[_type == "imageProjects" && featured == true] | order(orderRank) {
              _id,
              name,
              "slug": slug.current,
              "coverImage": coverImage.asset->url,
              projectTagline,
              featured,
              client->{
                title
              }
            }
          `),
          client.fetch(groq`
            *[_type == "videoProjects" && featured == true] | order(orderRank) {
              _id,
              name,
              "slug": slug.current,
              "thumbnailImage": thumbnailImage.asset->url,
              projectTagline,
              client->{
                title
              },
              "videoGallery": videoGallery[] {
                "asset": asset->,
                "playbackId": asset.playbackId,
                "assetRef": asset._ref,
                "caption": caption
              },
              coverVideo
            }
          `),
          client.fetch(groq`
            *[_type == "mux.videoAsset"] {
              _id,
              playbackId
            }
          `)
        ])

        const enhancedProjects = videoProjects.map(project => {
          if (project.coverVideo?.asset?.asset?._ref) {
            const coverVideoRef = project.coverVideo.asset.asset._ref;
            const muxAsset = muxAssets.find(a => a._id === coverVideoRef);

            if (muxAsset?.playbackId) {
              return {
                ...project,
                video: {
                  asset: {
                    _type: "mux.videoAsset",
                    playbackId: muxAsset.playbackId
                  },
                  hoverPreview: project.coverVideo.hoverPreview || {}
                },
                coverVideo: {
                  ...project.coverVideo,
                  asset: {
                    ...project.coverVideo.asset,
                    playbackId: muxAsset.playbackId
                  }
                }
              };
            }
          }

          return project;
        });

        setProjects({ imageProjects, videoProjects: enhancedProjects });
        setLoading(false);
      } catch {
        setProjects({ imageProjects: [], videoProjects: [] });
        setLoading(false);
      }
    }

    fetchProjects();
  }, [initialData])

  const handleProjectHover = (project) => {
    setHoveredProject(project)
  }

  const handleProjectLeave = () => {
    setHoveredProject(null)
  }

  const contextValue = {
    projects,
    loading,
    hoveredProject,
    handleProjectHover,
    handleProjectLeave,
    registerTopGallery,
    registerBottomGallery
  }

  return (
    <GalleryContext.Provider value={contextValue}>
      {children}
    </GalleryContext.Provider>
  )
}
