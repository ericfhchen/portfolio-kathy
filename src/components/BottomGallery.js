'use client'

import Link from 'next/link'
import { useGalleryContext } from './GalleryContext'
import { useRef, useEffect, useState, useCallback } from 'react'
import Mux from '@mux/mux-player-react'
import Image from 'next/image'

/**
 * BottomGallery - Revolutionary zero-delay hover video playback
 * 
 * BREAKTHROUGH APPROACH: Continuous Background Playback
 * =====================================================
 * 
 * Traditional approaches (including our previous attempts):
 * - Preload → Pause → Play on hover (still has 50-65ms delay)
 * - Browser clears buffer/state when pausing
 * - play() always requires some initialization time
 * 
 * Revolutionary solution:
 * 1. 🎬 Videos play continuously in background (muted & invisible)
 * 2. ⚡ Hover just changes CSS opacity (truly instant ~0ms)
 * 3. 🔇 All videos stay muted for seamless hover previews
 * 4. 🔄 Videos loop automatically in their hover preview ranges
 * 5. 🚀 No play()/pause() calls during hover = zero delay
 * 
 * Result: Genuinely instant video hover with no perceptible delay
 */
export default function BottomGallery() {
  const { projects, hoveredProject, handleProjectHover, handleProjectLeave, registerBottomGallery } = useGalleryContext()
  const videoRefs = useRef({});
  const galleryRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [touchedProject, setTouchedProject] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [preloadedVideos, setPreloadedVideos] = useState(new Set());
  const handlerRefs = useRef({});
  
  // Register this gallery's container with the context
  useEffect(() => {
    if (galleryRef.current) {
      registerBottomGallery(galleryRef.current);
    }
  }, [registerBottomGallery]);
  
  // Mobile detection - similar to CreditsOverlay component
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    // Set initial state
    checkMobile()
    
    // Update on resize
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
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

  // Get hover preview settings from a project
  const getHoverPreviewSettings = useCallback((project) => {
    const hoverPreview = project.coverVideo?.hoverPreview || project.video?.hoverPreview || {};
    const startTimeString = hoverPreview.startTime;
    const endTimeString = hoverPreview.endTime;
    
    const startTime = startTimeString ? timeToSeconds(startTimeString) : 0;
    const endTime = endTimeString ? timeToSeconds(endTimeString) : null;
    
    return { startTime, endTime };
  }, []);
  
  // Removed getThumbTime function - thumbnail images will use default MUX thumbnails
  
  // Improve video element access consistency
  const getVideoElement = useCallback((projectId) => {
    const videoElement = videoRefs.current[projectId];
    if (!videoElement) return null;
    
    // Try shadowRoot first, then fall back to direct reference
    return videoElement.shadowRoot?.querySelector('video') || videoElement;
  }, []);
  
  // Revolutionary preloading: Keep videos playing continuously but hidden
  useEffect(() => {
    if (!projects.videoProjects || isMobile) return;
    
    const preloadTimeout = setTimeout(() => {
      console.log(`🚀 Starting continuous playback for ${projects.videoProjects.length} videos`);
      
      projects.videoProjects.forEach((project, index) => {
        const playbackId = project.video?.asset?.playbackId;
        if (playbackId) {
          // Stagger startup to avoid overwhelming browser
          setTimeout(() => {
            const videoEl = getVideoElement(project._id);
            if (videoEl) {
              const { startTime, endTime } = getHoverPreviewSettings(project);
              
              try {
                console.log(`🎬 Setting up continuous playback for video ${project._id}`);
                
                // Make completely silent and invisible
                videoEl.volume = 0;
                videoEl.muted = true;
                
                // Position at start time
                videoEl.currentTime = startTime;
                
                // Set up looping for hover preview
                const loopHandler = () => {
                  if (endTime !== null && videoEl.currentTime >= endTime) {
                    videoEl.currentTime = startTime;
                  }
                };
                
                videoEl.addEventListener('timeupdate', loopHandler);
                handlerRefs.current[`loop-${project._id}`] = loopHandler;
                
                // Start playing and keep playing
                videoEl.play().then(() => {
                  // Mark as ready for instant switching
                  setPreloadedVideos(prev => new Set([...prev, project._id]));
                  console.log(`✅ Video ${project._id} now playing continuously and ready for instant hover`);
                }).catch(e => {
                  console.warn(`❌ Error starting continuous playback for ${project._id}:`, e);
                });
                
              } catch (e) {
                console.warn(`❌ Error setting up continuous playback for ${project._id}:`, e);
              }
            }
          }, index * 200); // Quick stagger
        }
      });
    }, 1000); // Start sooner
    
    return () => {
      clearTimeout(preloadTimeout);
      // Cleanup loop handlers
      Object.entries(handlerRefs.current).forEach(([key, handler]) => {
        if (key.startsWith('loop-')) {
          const projectId = key.replace('loop-', '');
          const videoEl = getVideoElement(projectId);
          if (videoEl) {
            videoEl.removeEventListener('timeupdate', handler);
          }
        }
      });
    };
  }, [projects.videoProjects, isMobile, getVideoElement, getHoverPreviewSettings]);
  
  // Simplified touchcancel handler for continuous playback system
  useEffect(() => {
    if (isMobile) return;
    
    const handleTouchCancel = () => {
      if (touchedProject) {
        console.log(`👆 Touch cancelled on project ${touchedProject._id}`);
      }
      setTouchedProject(null);
    };

    document.addEventListener('touchcancel', handleTouchCancel);
    
    return () => {
      document.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [touchedProject, isMobile]);
  
  // Instant video activation - videos are already playing, just show/hide them
  const setupActiveVideo = useCallback((videoEl, videoElement, project) => {
    if (!videoEl || !project) return;
    
    const isPreloaded = preloadedVideos.has(project._id);
    if (!isPreloaded) {
      console.warn(`Video ${project._id} not in continuous playback mode yet`);
      return;
    }
    
    console.log(`⚡ INSTANT activation for video ${project._id}`);
    console.time(`instant-activation-${project._id}`);
    
    try {
      // Video is already playing at the right time and looping
      // Just make it audible if needed (though we keep it muted for hover previews)
      videoEl.muted = true; // Keep muted for hover previews
      videoEl.volume = 0; // Keep silent
      
      // The video is already visible via CSS opacity changes
      // No play() call needed - it's already playing!
      
      console.timeEnd(`instant-activation-${project._id}`);
      console.log(`🚀 Video ${project._id} activated INSTANTLY - no delays!`);
      
    } catch (e) {
      console.warn("Error in instant activation:", e);
      console.timeEnd(`instant-activation-${project._id}`);
    }
  }, [preloadedVideos]);
  
  // Video deactivation - just ensure it stays muted/invisible
  const deactivateVideo = useCallback((videoEl, project) => {
    if (!videoEl || !project) return;
    
    try {
      // Keep it playing but ensure it's muted and will be hidden by CSS
      videoEl.muted = true;
      videoEl.volume = 0;
      
      console.log(`💤 Video ${project._id} deactivated but still playing in background`);
    } catch (e) {
      console.warn("Error in video deactivation:", e);
    }
  }, []);

  // Handle playing videos on hover or touch - revolutionary instant system
  // Videos are continuously playing - we just control visibility
  useEffect(() => {
    if (!projects.videoProjects || isMobile) return;
    
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
        // Get video element (simplified since we don't need to do much with it)
        const videoEl = videoElement.shadowRoot?.querySelector('video') || videoElement;
        
        if (isActive) {
          // Instantly activate the video (it's already playing in background)
          setupActiveVideo(videoEl, videoElement, project);
        } else {
          // Keep video playing but ensure it's deactivated
          deactivateVideo(videoEl, project);
        }
      } catch (e) {
        console.log("Error in revolutionary hover system:", e);
      }
    });
  }, [hoveredProject, touchedProject, projects.videoProjects, isMobile, setupActiveVideo, deactivateVideo]);

  // Simplified touch handlers for continuous playback system
  const handleTouchStart = useCallback((project, e) => {
    // On mobile, don't handle video interactions
    if (isMobile) return;
    
    // Prevent default to avoid immediate navigation on touch
    e.preventDefault();
    
    // Set the touched project - the main effect will handle video activation
    setTouchedProject(project);
    
    console.log(`👆 Touch started on project ${project._id}`);
  }, [isMobile]);

  const handleTouchEnd = useCallback(() => {
    // On mobile, don't handle video interactions
    if (isMobile) return;
    
    if (touchedProject) {
      console.log(`👆 Touch ended on project ${touchedProject._id}`);
    }
    
    // Clear the touched project - the main effect will handle deactivation
    setTouchedProject(null);
  }, [isMobile, touchedProject]);

  // No video projects to display
  if (!projects.videoProjects || projects.videoProjects.length === 0) {
    return <div className="bottom-gallery absolute bottom-0 left-0 right-0 px-2.5 z-[9]"></div>
  }
  
  return (
    <div ref={galleryRef} className="bottom-gallery absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 z-[9]">
      <div className="mb-2 text-left md:hidden">
        Motion
      </div>
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

            return (
            <Link 
              href={`/project/${project.slug}`}
              key={project._id}
              className="w-[calc(40vw-20px)] h-[calc(40vw-20px)] md:w-[200px] md:h-[200px] flex-shrink-0 relative overflow-hidden"
              onMouseEnter={() => !isMobile && handleProjectHover(project)}
              onMouseLeave={!isMobile ? handleProjectLeave : undefined}
              onTouchStart={(e) => handleTouchStart(project, e)}
              onTouchEnd={() => handleTouchEnd()}
              onTouchCancel={() => handleTouchEnd()}
            >
              <div className="relative w-full h-full overflow-hidden">
                {/* Always show thumbnail image as the base */}
                {project.thumbnailImage && (
                  <div className={`w-full h-full relative  ${hoveredProject?._id === project._id ? 'opacity-0' : 'opacity-100'}`}>
                    <Image
                      src={project.thumbnailImage}
                      alt={project.name}
                      width={200}
                      height={200}
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}

                {/* On desktop, show video when hovered if available */}
                {!isMobile && hasValidVideo && (
                  <div 
                    className={`absolute inset-0  ${hoveredProject?._id === project._id ? 'opacity-100' : 'opacity-0'}`}
                  >
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
                        preload="none" // We handle loading manually via continuous playback
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
                          willChange: 'transform, opacity',
                          transform: 'translate3d(0, 0, 0)', // Force GPU acceleration
                        }}
                        disableCookies={true}
                        playerSoftware="custom:portfolio"
                        playsInline={true}
                        nohotkeys
                        controls={false}
                        defaultHiddenCaptions
                        noposterplay
                        hidevolumebar
                        noposter
                      />
                    </div>
                  </div>
                )}

                {/* Fallback if no thumbnail image */}
                {!project.thumbnailImage && (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-xs text-gray-400">
                    No thumbnail
                  </div>
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