'use client'

import Link from 'next/link'
import { useGalleryContext } from './GalleryContext'
import { useState, useRef, useEffect } from 'react'
import Mux from '@mux/mux-player-react'

export default function BottomGallery() {
  const { projects, hoveredProject, handleProjectHover, handleProjectLeave, registerBottomGallery } = useGalleryContext()
  const videoRefs = useRef({});
  const [videosInitialized, setVideosInitialized] = useState({});
  const playerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const galleryRef = useRef(null);
  
  // Register this gallery's scroll container with the context
  useEffect(() => {
    if (galleryRef.current) {
      registerBottomGallery(galleryRef.current);
    }
  }, [registerBottomGallery]);
  
  // Use refs for utility functions to avoid dependency issues
  const utils = useRef({
    timeToSeconds: (timeStr) => {
      if (!timeStr) return 0;
      const [minutes, seconds] = timeStr.split(':').map(Number);
      return minutes * 60 + seconds;
    },
    
    forceSetThumbnail: (muxId, time) => {
      if (!playerRef.current) return false;
      
      const videoEl = playerRef.current.querySelector('video');
      if (!videoEl) {
        console.error('Video element not found in player');
        return false;
      }
      
      try {
        // Set the video's current time
        videoEl.currentTime = time;
        console.log('Set video currentTime to:', time);
        
        // Find and update poster elements
        const elements = playerRef.current.querySelectorAll('img');
        let posterElement = null;
        
        elements.forEach(el => {
          if (el.src && el.src.includes(muxId)) {
            posterElement = el;
          }
        });
        
        if (posterElement) {
          // Update the src to include the time parameter
          if (posterElement.src.includes('?')) {
            if (posterElement.src.includes('time=')) {
              posterElement.src = posterElement.src.replace(/time=\d+(\.\d+)?/, `time=${time}`);
            } else {
              posterElement.src = `${posterElement.src}&time=${time}`;
            }
          } else {
            posterElement.src = `${posterElement.src}?time=${time}`;
          }
        }
        
        return true;
      } catch (error) {
        console.error('Error while forcing thumbnail update:', error);
        return false;
      }
    },
    
    resetToThumbnail: (projectId, muxId, time) => {
      const videoElement = videoRefs.current[projectId];
      
      if (!videoElement) {
        console.error(`Video element for project ${projectId} not found`);
        return;
      }
      
      // Pause the video and set time
      videoElement.pause();
      videoElement.currentTime = time;
      
      // Force set the thumbnail
      utils.current.forceSetThumbnail(muxId, time);
    }
  });

  // Debug logging for projects
  useEffect(() => {
    if (projects?.videoProjects) {
      projects.videoProjects.forEach(project => {
        console.log(`Project ${project.name} thumbTime:`, project.thumbTime);
        console.log(`Project ${project.name} video.asset.thumbTime:`, project.video?.asset?.thumbTime);
      });
    }
  }, [projects?.videoProjects]);

  // Initialize videos with thumbnails
  useEffect(() => {
    if (!projects.videoProjects) return;
    
    const initializeVideos = () => {
      const newInitializedState = {...videosInitialized};
      
      projects.videoProjects.forEach(project => {
        if (project.video?.asset?.playbackId) {
          const videoElement = videoRefs.current[project._id];
          if (videoElement) {
            const thumbTime = project.thumbTime || project.video?.asset?.thumbTime || 0;
            utils.current.forceSetThumbnail(project.video.asset.playbackId, thumbTime);
            newInitializedState[project._id] = true;
          }
        }
      });
      
      if (Object.keys(newInitializedState).length > Object.keys(videosInitialized).length) {
        setVideosInitialized(newInitializedState);
      }
    };
    
    initializeVideos();
    const timers = [
      setTimeout(initializeVideos, 100),
      setTimeout(initializeVideos, 500),
      setTimeout(initializeVideos, 1000),
      setTimeout(initializeVideos, 2000)
    ];
    
    return () => timers.forEach(timer => clearTimeout(timer));
  }, [projects.videoProjects, videosInitialized]);
  
  // Handle hover state for videos
  useEffect(() => {
    // Reset non-hovered videos to thumbnail
    Object.keys(videoRefs.current).forEach(id => {
      const project = projects.videoProjects.find(p => p._id === id);
      
      if (project && project.video?.asset?.playbackId) {
        const thumbTime = project.thumbTime || project.video?.asset?.thumbTime || 0;
        
        if (!hoveredProject || hoveredProject._id !== id) {
          utils.current.resetToThumbnail(id, project.video.asset.playbackId, thumbTime);
        }
      }
    });
    
    // Play hovered video within time range
    if (hoveredProject && hoveredProject.video?.asset?.playbackId) {
      const startTime = hoveredProject.video?.hoverPreview?.startTime 
        ? utils.current.timeToSeconds(hoveredProject.video.hoverPreview.startTime) 
        : 0;
      
      const endTime = hoveredProject.video?.hoverPreview?.endTime
        ? utils.current.timeToSeconds(hoveredProject.video.hoverPreview.endTime)
        : undefined;
      
      const videoElement = videoRefs.current[hoveredProject._id];
      if (videoElement) {
        videoElement.currentTime = startTime;
        
        const handleTimeUpdate = () => {
          if (endTime && videoElement.currentTime >= endTime) {
            videoElement.currentTime = startTime;
          }
        };
        
        videoElement.addEventListener('timeupdate', handleTimeUpdate);
        videoElement.play().catch(err => console.error('Error playing video:', err));
        
        return () => {
          videoElement.removeEventListener('timeupdate', handleTimeUpdate);
        };
      }
    }
  }, [hoveredProject, projects.videoProjects]);

  // Set up one-time video event listeners
  const listenerSetupRef = useRef(false);
  useEffect(() => {
    if (listenerSetupRef.current || !playerRef.current) return;
    
    const videoEl = playerRef.current.querySelector('video');
    if (!videoEl) return;
    
    listenerSetupRef.current = true;
    
    // Set up basic video event listeners
    const handlers = {
      loadedmetadata: () => console.log('Video metadata loaded, duration:', videoEl.duration),
      loadstart: () => console.log('Video load started'),
      canplay: () => console.log('Video can play now'),
      canplaythrough: () => console.log('Video fully loaded')
    };
    
    // Add listeners
    Object.entries(handlers).forEach(([event, handler]) => {
      videoEl.addEventListener(event, handler);
    });
    
    // Clean up on unmount
    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        videoEl.removeEventListener(event, handler);
      });
    };
  }, []);

  // No video projects to display
  if (!projects.videoProjects || projects.videoProjects.length === 0) {
    return <div className="bottom-gallery absolute bottom-0 left-0 right-0 px-2.5 z-[9]"></div>
  }
  
  if (!projects.videoProjects) return null;
  
  return (
    <div ref={galleryRef} className="bottom-gallery absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 z-[9]">
      {/* Title for the bottom gallery */}
      <div className="mb-2 text-left">
        <span>Motion</span>
      </div>
      
      <div 
        ref={scrollContainerRef}
        className="w-full overflow-x-auto overflow-y-hidden scrollbar-hide"
        style={{ 
          scrollbarWidth: 'none',  /* Firefox */
          msOverflowStyle: 'none',  /* IE and Edge */
        }}
      >
        <div className="flex gap-2">
          {projects.videoProjects.map((project) => {
            const thumbTime = project.thumbTime || project.video?.asset?.thumbTime || 0;

            return (
            <Link 
              href={`/video-project/${project.slug}`}
              key={project._id}
              className="w-[200px] h-[200px] flex-shrink-0 relative overflow-hidden"
              onMouseEnter={() => handleProjectHover(project)}
              onMouseLeave={() => {
                utils.current.resetToThumbnail(project._id, project.video.asset.playbackId, thumbTime);
                handleProjectLeave();
              }}
            >
              <div className="relative w-full h-full overflow-hidden">
                {project.video?.asset?.playbackId && (
                  <div className="w-full h-full relative overflow-hidden">
                    <div 
                      className="absolute inset-0 origin-center"
                      style={{
                        transform: 'translate(-50%, -50%) scale(2.5)',
                        left: '50%',
                        top: '50%',
                        width: '100%',
                        height: '100%',
                      }}
                    >
                      <Mux
                        ref={el => {
                          videoRefs.current[project._id] = el;
                          if (el) {
                            utils.current.forceSetThumbnail(project.video.asset.playbackId, thumbTime);
                            setTimeout(() => utils.current.forceSetThumbnail(project.video.asset.playbackId, thumbTime), 100);
                          }
                        }}
                        onLoadedMetadata={() => {
                          utils.current.forceSetThumbnail(project.video.asset.playbackId, thumbTime);
                        }}
                        onLoadStart={() => console.log(`Load started for ${project.name}`)}
                        onLoad={() => utils.current.forceSetThumbnail(project.video.asset.playbackId, thumbTime)}
                        onPosterLoaded={() => console.log(`Poster loaded for ${project.name}`)}
                        playbackId={project.video.asset.playbackId}
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
                          overflow: 'hidden'
                        }}
                        envKey="ENV_KEY"
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