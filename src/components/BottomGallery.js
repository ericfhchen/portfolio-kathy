'use client'

import Link from 'next/link'
import { useGalleryContext } from './GalleryContext'
import { useRef, useEffect, useState } from 'react'
import Mux from '@mux/mux-player-react'
import Image from 'next/image'

export default function BottomGallery() {
  const { projects, hoveredProject, handleProjectHover, handleProjectLeave, registerBottomGallery } = useGalleryContext()
  const videoRefs = useRef({});
  const galleryRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [touchedProject, setTouchedProject] = useState(null);
  const timeoutRef = useRef(null);
  const handlerRefs = useRef({});
  
  // Register this gallery's container with the context
  useEffect(() => {
    if (galleryRef.current) {
      registerBottomGallery(galleryRef.current);
    }
  }, [registerBottomGallery]);
  
  // Helper to convert time string (MM:SS or MM:SS.mm) to seconds
  const timeToSeconds = (timeStr) => {
      if (!timeStr) return 0;
    
    // Handle MM:SS format
    if (timeStr.includes(':') && !timeStr.includes('.')) {
      const [minutes, seconds] = timeStr.split(':').map(Number);
      return minutes * 60 + seconds;
    }
    
    // Handle MM:SS.mm format
    if (timeStr.includes(':') && timeStr.includes('.')) {
      const [minutePart, secondPart] = timeStr.split(':');
      const minutes = Number(minutePart);
      const [seconds, milliseconds] = secondPart.split('.').map(Number);
      return minutes * 60 + seconds + (milliseconds / 100);
    }
    
    // If it's just a number, return it
    return Number(timeStr);
  };

  // Get the thumbnail time from project data
  const getThumbTime = (project) => {
    // Check for thumb time in the dedicated cover video first
    if (project.coverVideo?.thumbTime !== undefined) {
      return project.coverVideo.thumbTime;
    }
    
    // Check for thumb time in the video asset
    if (project.video?.asset?.thumbTime !== undefined) {
      return project.video.asset.thumbTime;
    }
    
    // Then check project's own thumb time as fallback
    if (project.thumbTime !== undefined) {
      return project.thumbTime;
    }
    
    // Fallback to 0
    return 0;
  };
  
  // Get hover preview settings from a project
  const getHoverPreviewSettings = (project) => {
    const hoverPreview = project.coverVideo?.hoverPreview || project.video?.hoverPreview || {};
    const startTimeString = hoverPreview.startTime;
    const endTimeString = hoverPreview.endTime;
    
    const startTime = startTimeString ? timeToSeconds(startTimeString) : 0;
    const endTime = endTimeString ? timeToSeconds(endTimeString) : null;
    
    return { startTime, endTime };
  };
  
  // Fix 1: Improve video element access consistency
  const getVideoElement = (projectId) => {
    const videoElement = videoRefs.current[projectId];
    if (!videoElement) return null;
    
    // Try shadowRoot first, then fall back to direct reference
    return videoElement.shadowRoot?.querySelector('video') || videoElement;
  };
  
  // Fix 3: Improve the thumb time reset
  const resetVideoToThumbnail = (projectId) => {
    const videoEl = getVideoElement(projectId);
    if (!videoEl) return;
    
    try {
      const project = projects.videoProjects.find(p => p._id === projectId);
      if (!project) return;
      
      videoEl.pause();
      
      // Remove existing handlers
      if (handlerRefs.current[projectId]) {
        videoEl.removeEventListener('timeupdate', handlerRefs.current[projectId]);
        delete handlerRefs.current[projectId];
      }
      
      const thumbTime = getThumbTime(project);
      
      // Force multiple updates to ensure the thumbnail sticks
      videoEl.currentTime = thumbTime;
      
      // This helps on some mobile browsers that need a second attempt
      requestAnimationFrame(() => {
        videoEl.currentTime = thumbTime;
      });
    } catch (e) {
      console.log("Error in resetVideoToThumbnail:", e);
    }
  };
  
  // Setup video for active viewing - either hover or touch
  const setupActiveVideo = (videoEl, videoElement, project) => {
    if (!videoEl || !project) return;
    
    // Get hover preview settings
    const { startTime, endTime } = getHoverPreviewSettings(project);
    
    // Set the start time first
    try {
      videoEl.currentTime = startTime;
    } catch (e) {
      console.log("Error setting start time:", e);
    }
    
    // Setup looping if needed
    if (endTime !== null && startTime !== endTime) {
      // Create a new handler and store it by project ID for later removal
      const timeUpdateHandler = () => {
        if (videoEl.currentTime >= endTime) {
          videoEl.currentTime = startTime;
        }
      };
      
      // Store the handler for later cleanup
      handlerRefs.current[project._id] = timeUpdateHandler;
      
      // Add the event listener
      try {
        videoEl.addEventListener('timeupdate', timeUpdateHandler);
      } catch (e) {
        console.log("Error adding timeupdate handler:", e);
      }
    }
    
    // Play the video
    try {
      videoEl.play().catch(e => {
        console.log("Error playing video:", e);
      });
    } catch (e) {
      console.log("Error initiating play:", e);
    }
  };
  
  // Handle playing videos on hover or touch - optimized version
  useEffect(() => {
    if (!projects.videoProjects) return;
    
    // Use either hoveredProject or touchedProject (for mobile)
    const activeProject = hoveredProject || touchedProject;
    
    // For each project video element
    Object.keys(videoRefs.current).forEach(projectId => {
      const videoElement = videoRefs.current[projectId];
      const project = projects.videoProjects.find(p => p._id === projectId);
      
      if (!project || !videoElement) return;
      
      // Make sure we have a valid playback ID
      const playbackId = project.video?.asset?.playbackId;
      if (!playbackId) return;
      
      // Is this the hovered or touched project?
      const isActive = activeProject?._id === projectId;
      
      try {
        // Simplify video element lookup to reduce overhead
        let videoEl = null;
        
        // Try to access the video element directly first
        if (videoElement.shadowRoot) {
          videoEl = videoElement.shadowRoot.querySelector('video');
        }
        
        // If we can't find the video element, use the Mux component
        if (!videoEl) {
          videoEl = videoElement;
        }
        
        if (isActive) {
          // Setup the video for active viewing
          setupActiveVideo(videoEl, videoElement, project);
        } else {
          // Reset videos that are not active
          // Pause the video
          try {
            videoEl.pause();
          } catch (e) {
            console.log("Error pausing video:", e);
          }
          
          // Remove event handlers
          if (handlerRefs.current[projectId]) {
            try {
              videoEl.removeEventListener('timeupdate', handlerRefs.current[projectId]);
              delete handlerRefs.current[projectId];
            } catch (e) {
              console.log("Error removing handler:", e);
            }
          }
          
          // Set thumbnail frame
          const thumbTime = getThumbTime(project);
          
          // Force update to thumbnail frame
          try {
            videoEl.currentTime = thumbTime;
          } catch (e) {
            console.log("Error setting thumb time:", e);
          }
        }
      } catch (e) {
        console.log("General error in video handling:", e);
      }
    });
    
    // Cleanup function
    return () => {
      // Remove all event handlers when component unmounts or dependencies change
      Object.entries(handlerRefs.current).forEach(([projectId, handler]) => {
        try {
          const videoElement = videoRefs.current[projectId];
          if (videoElement) {
            const videoEl = videoElement.shadowRoot?.querySelector('video') || videoElement;
            videoEl.removeEventListener('timeupdate', handler);
          }
        } catch (e) {
          console.log("Error in cleanup:", e);
        }
      });
      
      // Clear the handlers object
      handlerRefs.current = {};
    };
  }, [hoveredProject, touchedProject, projects.videoProjects]);

  // Fix 2: Enhance the touch handlers
  const handleTouchStart = (project, e) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    e.preventDefault();
    setTouchedProject(project);
    
    // Preload the video immediately to reduce delay
    const videoEl = getVideoElement(project._id);
    if (videoEl) {
      videoEl.load();
    }
  };

  const handleTouchEnd = () => {
    // If we have a previously touched project, reset its video
    if (touchedProject && touchedProject._id) {
      const projectId = touchedProject._id;
      
      // Make a local reference to the touched project before we clear it
      const projectToReset = touchedProject;
      
      // Clear the touched project state immediately
      setTouchedProject(null);
      
      // Immediately pause the video
      try {
        const videoElement = videoRefs.current[projectId];
        if (videoElement) {
          let videoEl = videoElement.shadowRoot?.querySelector('video') || videoElement;
          videoEl.pause();
          
          // Remove any timeupdate handlers
          if (handlerRefs.current[projectId]) {
            videoEl.removeEventListener('timeupdate', handlerRefs.current[projectId]);
            delete handlerRefs.current[projectId];
          }
          
          // Force thumbnail frame immediately
          const thumbTime = getThumbTime(projectToReset);
          videoEl.currentTime = thumbTime;
        }
      } catch (e) {
        console.log("Error in touch end handler:", e);
      }
      
      // Set a small timeout to ensure the video resets to the poster frame
      // This helps on some mobile browsers that need a second attempt
      timeoutRef.current = setTimeout(() => {
        resetVideoToThumbnail(projectId);
      }, 50);
    } else {
      setTouchedProject(null);
    }
  };

  // Add touchcancel handler to clean up if touch is interrupted
  useEffect(() => {
    const handleTouchCancel = () => {
      // Reset the previously touched project if any
      if (touchedProject && touchedProject._id) {
        resetVideoToThumbnail(touchedProject._id);
      }
      setTouchedProject(null);
    };

    document.addEventListener('touchcancel', handleTouchCancel);
    
    return () => {
      document.removeEventListener('touchcancel', handleTouchCancel);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [touchedProject, resetVideoToThumbnail]);

  // No video projects to display
  if (!projects.videoProjects || projects.videoProjects.length === 0) {
    return <div className="bottom-gallery absolute bottom-0 left-0 right-0 px-2.5 z-[9]"></div>
  }
  
  return (
    <div ref={galleryRef} className="bottom-gallery absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 z-[9]">
      <div 
        ref={scrollContainerRef}
        className="w-full overflow-x-auto overflow-y-hidden scrollbar-hide"
        style={{ 
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <div className="flex gap-2">
          {projects.videoProjects.map((project) => {
            // Get the playback ID from the processed data structure
            const playbackId = project.video?.asset?.playbackId;
            const hasValidVideo = !!playbackId;
            const thumbTime = getThumbTime(project);

            return (
            <Link 
              href={`/project/${project.slug}`}
              key={project._id}
              className="w-[calc(40vw-20px)] h-[calc(40vw-20px)] md:w-[200px] md:h-[200px] flex-shrink-0 relative overflow-hidden"
              onMouseEnter={() => handleProjectHover(project)}
              onMouseLeave={handleProjectLeave}
              onTouchStart={(e) => handleTouchStart(project, e)}
              onTouchEnd={() => handleTouchEnd()}
              onTouchCancel={() => handleTouchEnd()}
            >
              <div className="relative w-full h-full overflow-hidden">
                  {hasValidVideo ? (
                  <div className="w-full h-full relative overflow-hidden">
                    <div 
                      className="absolute inset-0 origin-center"
                      style={{
                        transform: 'translate(-50%, -50%) scale(2)',
                        left: '50%',
                        top: '50%',
                        width: '100%',
                        height: '100%',
                      }}
                    >
                      <Mux
                        ref={el => {
                            if (el && playbackId) {
                            videoRefs.current[project._id] = el;
                            }
                          }}
                          playbackId={playbackId}
                        streamType="on-demand"
                        autoPlay={false}
                        muted={true}
                        loop={false}
                        preload="metadata"
                        defaultPosterTime={thumbTime}
                        thumbnailTime={thumbTime}
                        style={{ 
                          height: '100%',
                          width: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center',
                          '--controls': 'none',
                          '--media-control-display': 'none',
                          '--video-object-fit': 'cover',
                          '--video-object-position': 'center center',
                          '--poster-object-fit': 'cover',
                          '--poster-object-position': 'center center',
                          '--aspect-ratio-x': '1',
                          '--aspect-ratio-y': '1',
                          '--media-width': '110%',
                          '--media-height': '110%',
                          '--container-width': '100%',
                          '--container-height': '100%',
                          pointerEvents: 'none',
                          overflow: 'hidden',
                          willChange: 'transform' // Add will-change to optimize rendering
                        }}
                        disableCookies={true}
                        playerSoftware="custom:portfolio"
                        playsInline={true}
                        nohotkeys
                        controls={false}
                        defaultHiddenCaptions
                        noposterplay
                        hidevolumebar
                      />
                    </div>
                  </div>
                ) : (
                    // Fallback to coverImage if no valid video
                  project.coverImage ? (
                    <div className="w-full h-full relative">
                      <Image
                        src={project.coverImage}
                        alt={project.name}
                        width={200}
                        height={200}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-xs text-gray-400">
                      No thumbnail
                    </div>
                  )
                )}
              </div>
            </Link>
            );
          })}
        </div>
      </div>
    </div>
  )
} 