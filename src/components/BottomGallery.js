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
  const [isMobile, setIsMobile] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [touchedProjectId, setTouchedProjectId] = useState(null);
  const scrollTimeout = useRef(null);
  
  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Register this gallery's container with the context
  useEffect(() => {
    if (galleryRef.current) {
      registerBottomGallery(galleryRef.current);
    }
  }, [registerBottomGallery]);
  
  // Track scrolling state
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    
    const handleScroll = () => {
      setIsScrolling(true);
      
      // Clear previous timeout
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      
      // Set new timeout to detect when scrolling stops
      scrollTimeout.current = setTimeout(() => {
        setIsScrolling(false);
        setTouchedProjectId(null);
      }, 100);
    };
    
    scrollContainerRef.current.addEventListener('scroll', handleScroll);
    
    return () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.removeEventListener('scroll', handleScroll);
      }
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);
  
  // Trigger hover effect only when touching and scrolling simultaneously
  useEffect(() => {
    if (isScrolling && touchedProjectId) {
      const project = projects.videoProjects?.find(p => p._id === touchedProjectId);
      if (project) {
        handleProjectHover(project);
      }
    } else if (!isScrolling || !touchedProjectId) {
      handleProjectLeave();
    }
  }, [isScrolling, touchedProjectId, projects.videoProjects, handleProjectHover, handleProjectLeave]);
  
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
  
  // Handle touch events for mobile
  const handleTouchStart = (projectId) => {
    if (isMobile) {
      setTouchedProjectId(projectId);
    }
  };
  
  const handleTouchEnd = () => {
    if (isMobile) {
      setTouchedProjectId(null);
    }
  };
  
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
              onMouseEnter={() => !isMobile && handleProjectHover(project)}
              onMouseLeave={() => !isMobile && handleProjectLeave()}
              onTouchStart={() => handleTouchStart(project._id)}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
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