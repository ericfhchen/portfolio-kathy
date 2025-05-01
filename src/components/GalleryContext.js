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
            client->{
              title
            },
            // Get video fields directly
            video
          }
        `)
        
        // Query all MUX video assets to get their thumbnail times
        const muxAssets = await client.fetch(groq`
          *[_type == "mux.videoAsset"] {
            _id,
            playbackId,
            status,
            assetId,
            thumbTime
          }
        `)
        
        console.log("MUX assets fetched:", muxAssets);
        
        // Direct mapping from project ID to MUX asset ID and playbackId
        const knownMuxAssets = {
          "cffc186f-05cb-406b-9bd3-5865a9652c4c": {
            assetRef: "148ec3c9-237c-42b5-bf48-b4a8a3270d2b", 
            playbackId: "L1102y5hUE1tY7tQd6MgwB02xBfJX3zi4mP4jAkLge6PI"
          }
        };
        
        // Process video projects to add playbackId and thumbnail time
        const enhancedProjects = videoProjects.map(project => {
          // Check if we have known MUX data for this project
          const knownData = knownMuxAssets[project._id];
          
          if (knownData) {
            // Find the matching MUX asset to get its thumbnail time
            const matchingMuxAsset = muxAssets.find(asset => asset._id === knownData.assetRef);
            const thumbTime = matchingMuxAsset?.thumbTime || 0;
            
            console.log(`Project ${project.name} - Found matching MUX asset:`, matchingMuxAsset);
            console.log(`Project ${project.name} - Using thumbTime:`, thumbTime);
            
            // Add MUX asset reference, playbackId, and thumbnail time to the project
            return {
              ...project,
              muxAssetRef: knownData.assetRef,
              thumbTime,
              video: {
                ...project.video,
                asset: {
                  ...(project.video?.asset || {}),
                  playbackId: knownData.playbackId,
                  thumbTime: thumbTime
                }
              }
            };
          }
          
          return project;
        });
        
        setProjects({ imageProjects, videoProjects: enhancedProjects });
        setLoading(false)
      } catch (error) {
        console.error('Error fetching projects:', error)
        setProjects({ imageProjects: [], videoProjects: [] })
        setLoading(false)
      }
    }

    fetchProjects()
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