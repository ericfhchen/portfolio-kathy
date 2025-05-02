'use client'

import { createContext, useState, useEffect, useContext, useRef } from 'react'
import { client } from '../sanity/lib/client'
import { groq } from 'next-sanity'

// Create context
export const GalleryContext = createContext(null)

// Custom hook to use the gallery context
export function useGalleryContext() {
  return useContext(GalleryContext)
}

// Provider component
export function GalleryProvider({ children }) {
  const [projects, setProjects] = useState({ imageProjects: [], videoProjects: [] })
  const [loading, setLoading] = useState(true)
  const [hoveredProject, setHoveredProject] = useState(null)
  const topGalleryRef = useRef(null);
  const bottomGalleryRef = useRef(null);

  // Register refs for galleries to enable global wheel event handling
  const registerTopGallery = (ref) => {
    topGalleryRef.current = ref;
  };

  const registerBottomGallery = (ref) => {
    bottomGalleryRef.current = ref;
  };

  // Global wheel event handler
  useEffect(() => {
    // Function to find the scroll container inside a gallery
    const findScrollContainer = (galleryRef) => {
      if (!galleryRef) return null;
      
      // Look for direct children with overflow-x-auto class
      const directScrollContainer = Array.from(galleryRef.children)
        .find(child => 
          child.classList && 
          (child.classList.contains('overflow-x-auto') || 
           child.classList.contains('scrollbar-hide'))
        );
        
      if (directScrollContainer) return directScrollContainer;
      
      // If not found directly, try to find it deeper
      return galleryRef.querySelector('.overflow-x-auto') || 
             galleryRef.querySelector('.scrollbar-hide');
    };

    const handleGlobalWheel = (e) => {
      // Don't process if scrolling is disabled
      if (e.ctrlKey) return; // Allow zooming with ctrl+wheel
      
      // Check if the event target is within the top gallery
      if (topGalleryRef.current && (
          topGalleryRef.current === e.target || 
          topGalleryRef.current.contains(e.target))) {
        e.preventDefault();
        
        // Find the actual scroll container
        const scrollContainer = findScrollContainer(topGalleryRef.current);
        
        if (scrollContainer) {
          const scrollDelta = e.deltaX || e.deltaY * 1.5;
          scrollContainer.scrollLeft += scrollDelta;
          console.log('Global wheel: scrolling top gallery', scrollDelta);
        }
        return;
      }
      
      // Check if the event target is within the bottom gallery
      if (bottomGalleryRef.current && (
          bottomGalleryRef.current === e.target || 
          bottomGalleryRef.current.contains(e.target))) {
        e.preventDefault();
        
        // Find the actual scroll container
        const scrollContainer = findScrollContainer(bottomGalleryRef.current);
        
        if (scrollContainer) {
          const scrollDelta = e.deltaX || e.deltaY * 1.5;
          scrollContainer.scrollLeft += scrollDelta;
          console.log('Global wheel: scrolling bottom gallery', scrollDelta);
        }
        return;
      }
    };

    // Add global wheel event listener
    window.addEventListener('wheel', handleGlobalWheel, { passive: false, capture: true });
    
    return () => {
      window.removeEventListener('wheel', handleGlobalWheel, { capture: true });
    };
  }, []);

  useEffect(() => {
    async function fetchProjects() {
      try {
        // Fetch image projects for the top gallery
        const imageProjects = await client.fetch(groq`
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
        `)
        
        // Fetch video projects for the bottom gallery
        const videoProjects = await client.fetch(groq`
          *[_type == "videoProjects" && featured == true] | order(orderRank) {
            _id,
            name,
            "slug": slug.current,
            "coverImage": coverImage.asset->url,
            projectTagline,
            thumbTime,
            client->{
              title
            },
            // Get the video gallery 
            "videoGallery": videoGallery[] {
              "asset": asset->,
              "playbackId": asset.playbackId,
              "assetRef": asset._ref,
              "thumbTime": asset->thumbTime,
              "caption": caption
            },
            // Get the dedicated cover video
            coverVideo
          }
        `)
        
        // Get all Mux assets for reference
        const muxAssets = await client.fetch(groq`
          *[_type == "mux.videoAsset"] {
            _id,
            playbackId,
            thumbTime
          }
        `)
        
        // Process video projects to ensure they have the necessary data
        const enhancedProjects = videoProjects.map(project => {
          // Only use dedicated cover video
          if (project.coverVideo?.asset?.asset?._ref) {
            const coverVideoRef = project.coverVideo.asset.asset._ref;
            const muxAssetId = coverVideoRef;
            const muxAsset = muxAssets.find(a => a._id === muxAssetId);
            
            if (muxAsset?.playbackId) {
              return {
                ...project,
                thumbTime: project.thumbTime || project.coverVideo.thumbTime,
                video: {
                  asset: {
                    _type: "mux.videoAsset",
                    playbackId: muxAsset.playbackId,
                    thumbTime: muxAsset.thumbTime || project.coverVideo.thumbTime
                  },
                  hoverPreview: project.coverVideo.hoverPreview || {}
                }
              };
            }
          }
          
          // If no cover video, return project as-is without video
          return project;
        });
        
        setProjects({ imageProjects, videoProjects: enhancedProjects });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching projects:', error);
        setProjects({ imageProjects: [], videoProjects: [] });
        setLoading(false);
      }
    }

    fetchProjects();
  }, [])

  const handleProjectHover = (project) => {
    setHoveredProject(project)
  }

  const handleProjectLeave = () => {
    setHoveredProject(null)
  }

  // Value to be provided by the context
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