'use client'

import Link from 'next/link'
import { useGalleryContext } from './GalleryContext'
import { useRef, useEffect } from 'react'
import Mux from '@mux/mux-player-react'
import Image from 'next/image'

export default function BottomGallery() {
  const { projects, hoveredProject, handleProjectHover, handleProjectLeave, registerBottomGallery } = useGalleryContext()
  const videoRefs = useRef({});
  const galleryRef = useRef(null);
  const scrollContainerRef = useRef(null);
  
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
  
  // Handle playing videos on hover - optimized version
  useEffect(() => {
    if (!projects.videoProjects) return;
    
    // For each project video element
    Object.keys(videoRefs.current).forEach(projectId => {
      const videoElement = videoRefs.current[projectId];
      const project = projects.videoProjects.find(p => p._id === projectId);
      
      if (!project || !videoElement) return;
      
      // Make sure we have a valid playback ID
      const playbackId = project.video?.asset?.playbackId;
      if (!playbackId) return;
      
      // Is this the hovered project?
      const isHovered = hoveredProject?._id === projectId;
      
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
        
        // Store a persistent reference to the handler for faster cleanup
        if (isHovered) {
          // Get hover preview settings
          const hoverPreview = project.coverVideo?.hoverPreview || project.video?.hoverPreview || {};
          const startTimeString = hoverPreview.startTime;
          const endTimeString = hoverPreview.endTime;
          
          const startTime = startTimeString ? timeToSeconds(startTimeString) : 0;
          const endTime = endTimeString ? timeToSeconds(endTimeString) : null;
          
          // Set up time boundaries if needed and play immediately
          if (endTime !== null && startTime !== endTime) {
            videoEl.currentTime = startTime;
            
            // Only add the event listener if we need to handle looping
            if (!videoElement._timeUpdateHandler) {
              videoElement._timeUpdateHandler = () => {
                if (videoEl.currentTime >= endTime) {
                  videoEl.currentTime = startTime;
                }
              };
              
              videoEl.addEventListener('timeupdate', videoElement._timeUpdateHandler);
            }
          }
          
          // Play the video with a small timeout to allow browser to process
          requestAnimationFrame(() => {
            videoEl.play().catch(() => {
              // Silent error handling
            });
          });
        } else {
          // Pause when not hovered
          videoEl.pause();
          
          // Clean up any timeupdate event listeners
          if (videoElement._timeUpdateHandler) {
            try {
              videoEl.removeEventListener('timeupdate', videoElement._timeUpdateHandler);
              videoElement._timeUpdateHandler = null;
            } catch {
              // Ignore errors during cleanup
            }
          }
          
          // Set thumbnail frame
          const thumbTime = getThumbTime(project);
          
          // Use setTimeout with 0ms to put this at the end of the event queue
          // This ensures the pause command completes first
          setTimeout(() => {
            try {
              videoEl.currentTime = thumbTime;
            } catch (err) {
              // Silent error handling for seek operations
            }
          }, 0);
        }
      } catch {
        // Silent error handling
      }
    });
  }, [hoveredProject, projects.videoProjects]);

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
              className="w-[200px] h-[200px] flex-shrink-0 relative overflow-hidden"
              onMouseEnter={() => handleProjectHover(project)}
              onMouseLeave={handleProjectLeave}
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
                        preload="auto"
                        defaultPosterTime={thumbTime}
                        thumbnailTime={thumbTime}
                        style={{ 
                          height: '200px',
                          width: '200px',
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
                          '--container-width': '220px',
                          '--container-height': '220px',
                          pointerEvents: 'none',
                          overflow: 'hidden',
                          willChange: 'transform' // Add will-change to optimize rendering
                        }}
                        disableCookies={true}
                        playerSoftware="custom:portfolio"
                        debug={false}
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