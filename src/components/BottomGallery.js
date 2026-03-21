'use client'

import Link from 'next/link'
import { useGalleryContext } from './GalleryContext'
import { useRef, useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'

// Phase 1: Dynamic import defers ~420KB MuxPlayer bundle until needed
const Mux = dynamic(() => import('@mux/mux-player-react'), { ssr: false, loading: () => null })

/**
 * BottomGallery - Viewport-aware zero-delay hover video playback
 *
 * Only videos in/near the viewport get MuxPlayer mounted.
 * Continuous background playback for visible items = instant hover.
 * Items outside viewport render only thumbnail images.
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
  const itemRefs = useRef({});
  const [visibleIds, setVisibleIds] = useState(new Set());

  // Register this gallery's container with the context
  useEffect(() => {
    if (galleryRef.current) {
      registerBottomGallery(galleryRef.current);
    }
  }, [registerBottomGallery]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Phase 1: IntersectionObserver to track visible gallery items
  useEffect(() => {
    if (isMobile) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleIds(prev => {
          const next = new Set(prev);
          entries.forEach(entry => {
            const id = entry.target.dataset.projectId;
            if (entry.isIntersecting) {
              next.add(id);
            } else {
              next.delete(id);
            }
          });
          // Only update if changed
          if (next.size === prev.size && [...next].every(id => prev.has(id))) return prev;
          return next;
        });
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '0px 600px 0px 600px', // 600px horizontal buffer
        threshold: 0,
      }
    );

    // Observe all item elements
    Object.values(itemRefs.current).forEach(el => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [isMobile, projects.videoProjects]);

  // Helper to convert time string (MM:SS or MM:SS.mm) to seconds
  const timeToSeconds = (timeStr) => {
      if (!timeStr) return 0;

    if (timeStr.includes(':') && !timeStr.includes('.')) {
      const [minutes, seconds] = timeStr.split(':').map(Number);
      return minutes * 60 + seconds;
    }

    if (timeStr.includes(':') && timeStr.includes('.')) {
      const [minutePart, secondPart] = timeStr.split(':');
      const minutes = Number(minutePart);
      const [seconds, milliseconds] = secondPart.split('.').map(Number);
      return minutes * 60 + seconds + (milliseconds / 100);
    }

    return Number(timeStr);
  };

  const getHoverPreviewSettings = useCallback((project) => {
    const hoverPreview = project.coverVideo?.hoverPreview || project.video?.hoverPreview || {};
    const startTimeString = hoverPreview.startTime;
    const endTimeString = hoverPreview.endTime;

    const startTime = startTimeString ? timeToSeconds(startTimeString) : 0;
    const endTime = endTimeString ? timeToSeconds(endTimeString) : null;

    return { startTime, endTime };
  }, []);

  const getVideoElement = useCallback((projectId) => {
    const videoElement = videoRefs.current[projectId];
    if (!videoElement) return null;
    return videoElement.shadowRoot?.querySelector('video') || videoElement;
  }, []);

  // Phase 1: Only preload videos that are visible in/near viewport
  useEffect(() => {
    if (!projects.videoProjects || isMobile) return;

    // Only preload videos whose IDs are in visibleIds
    const visibleProjects = projects.videoProjects.filter(p => visibleIds.has(p._id));
    if (visibleProjects.length === 0) return;

    const timeouts = [];

    visibleProjects.forEach((project, index) => {
      const playbackId = project.video?.asset?.playbackId;
      if (!playbackId || preloadedVideos.has(project._id)) return;

      const timeout = setTimeout(() => {
        const videoEl = getVideoElement(project._id);
        if (videoEl) {
          const { startTime, endTime } = getHoverPreviewSettings(project);

          try {
            videoEl.volume = 0;
            videoEl.muted = true;
            videoEl.currentTime = startTime;

            const loopHandler = () => {
              if (endTime !== null && videoEl.currentTime >= endTime) {
                videoEl.currentTime = startTime;
              }
            };

            videoEl.addEventListener('timeupdate', loopHandler);
            handlerRefs.current[`loop-${project._id}`] = loopHandler;

            videoEl.play().then(() => {
              setPreloadedVideos(prev => new Set([...prev, project._id]));
            }).catch(() => {});

          } catch {
            // Failed to set up continuous playback
          }
        }
      }, index * 200);

      timeouts.push(timeout);
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [projects.videoProjects, isMobile, visibleIds, getVideoElement, getHoverPreviewSettings, preloadedVideos]);

  // Cleanup loop handlers when items leave viewport
  useEffect(() => {
    if (!projects.videoProjects) return;

    // Find videos that were preloaded but are no longer visible
    preloadedVideos.forEach(id => {
      if (!visibleIds.has(id)) {
        const handler = handlerRefs.current[`loop-${id}`];
        if (handler) {
          const videoEl = getVideoElement(id);
          if (videoEl) {
            videoEl.removeEventListener('timeupdate', handler);
          }
          delete handlerRefs.current[`loop-${id}`];
        }
        // Remove from preloaded set so it can re-preload when visible again
        setPreloadedVideos(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    });
  }, [visibleIds, preloadedVideos, getVideoElement, projects.videoProjects]);

  // Touchcancel handler
  useEffect(() => {
    if (isMobile) return;

    const handleTouchCancel = () => {
      setTouchedProject(null);
    };

    document.addEventListener('touchcancel', handleTouchCancel);

    return () => {
      document.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [touchedProject, isMobile]);

  // Instant video activation - videos are already playing, just show/hide
  const setupActiveVideo = useCallback((videoEl, videoElement, project) => {
    if (!videoEl || !project) return;
    if (!preloadedVideos.has(project._id)) return;

    try {
      videoEl.muted = true;
      videoEl.volume = 0;
    } catch {
      // Error in instant activation
    }
  }, [preloadedVideos]);

  const deactivateVideo = useCallback((videoEl, project) => {
    if (!videoEl || !project) return;

    try {
      videoEl.muted = true;
      videoEl.volume = 0;
    } catch {
      // Error in video deactivation
    }
  }, []);

  // Handle playing videos on hover - control visibility
  useEffect(() => {
    if (!projects.videoProjects || isMobile) return;

    const activeProject = hoveredProject || touchedProject;

    Object.keys(videoRefs.current).forEach(projectId => {
      const videoElement = videoRefs.current[projectId];
      const project = projects.videoProjects.find(p => p._id === projectId);

      if (!project || !videoElement) return;

      const playbackId = project.video?.asset?.playbackId;
      if (!playbackId) return;

      const isActive = activeProject?._id === projectId;

      try {
        const videoEl = videoElement.shadowRoot?.querySelector('video') || videoElement;

        if (isActive) {
          setupActiveVideo(videoEl, videoElement, project);
        } else {
          deactivateVideo(videoEl, project);
        }
      } catch {
        // Error in hover system
      }
    });
  }, [hoveredProject, touchedProject, projects.videoProjects, isMobile, setupActiveVideo, deactivateVideo]);

  const handleTouchStart = useCallback((project, e) => {
    if (isMobile) return;
    e.preventDefault();
    setTouchedProject(project);
  }, [isMobile]);

  const handleTouchEnd = useCallback(() => {
    if (isMobile) return;
    setTouchedProject(null);
  }, [isMobile]);

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
            const playbackId = project.video?.asset?.playbackId;
            const hasValidVideo = !!playbackId;
            const isVisible = visibleIds.has(project._id);

            return (
            <Link
              href={`/project/${project.slug}`}
              key={project._id}
              ref={el => { if (el) itemRefs.current[project._id] = el; }}
              data-project-id={project._id}
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
                      sizes="(max-width: 768px) 40vw, 200px"
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}

                {/* Phase 1: Only mount MuxPlayer for visible/near-viewport items */}
                {!isMobile && hasValidVideo && isVisible && (
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
                        preload="none"
                        maxResolution="720p"
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
                          transform: 'translate3d(0, 0, 0)',
                        }}
                        disableCookies={true}
                        disableTracking={true}
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
