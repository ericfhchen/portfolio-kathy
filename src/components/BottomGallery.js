'use client'

import Link from 'next/link'
import { useGalleryContext } from './GalleryContext'
import { useRef, useEffect, useState, useCallback } from 'react'
import Image from 'next/image'

/**
 * BottomGallery - MP4 hover previews with metadata-only preload
 *
 * Videos mount with preload="metadata" (only downloads moov atom, ~few KB).
 * Pre-decode runs in parallel: play() triggers a range-request for just the
 * bytes near the start position (~200-500KB), not the full 16MB file.
 * On hover: play from cached decoded frame. On leave: pause.
 */
export default function BottomGallery() {
  const { projects, hoveredProject, handleProjectHover, handleProjectLeave, registerBottomGallery } = useGalleryContext()
  const videoRefs = useRef({});
  const galleryRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [touchedProject, setTouchedProject] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const rafIdRef = useRef(null);
  const hoverTimestampRef = useRef(null);
  const hoveredIdRef = useRef(null);
  const overlayRefs = useRef({});
  const itemRefs = useRef({});
  const [mountedIds, setMountedIds] = useState(new Set());
  const failedVideosRef = useRef(new Set());
  const predecodedRef = useRef(new Set());
  const predecodeQueueRef = useRef([]);
  const predecodeRunningRef = useRef(false);

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

  // IntersectionObserver — mountedIds only grows
  useEffect(() => {
    if (isMobile) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setMountedIds(prev => {
          const next = new Set(prev);
          let changed = false;
          entries.forEach(entry => {
            const id = entry.target.dataset.projectId;
            if (entry.isIntersecting && !next.has(id)) {
              next.add(id);
              changed = true;
            }
          });
          return changed ? next : prev;
        });
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '0px 2000px 0px 2000px',
        threshold: 0,
      }
    );

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
    return videoRefs.current[projectId] || null;
  }, []);

  // Serialized pre-decode queue: one at a time to avoid CPU contention.
  // With preload="metadata", each play() only range-requests ~200-500KB.
  const runNextPredecode = useCallback(() => {
    if (predecodeRunningRef.current) return;
    if (hoveredIdRef.current) return; // yield CPU to hovered video

    const next = predecodeQueueRef.current.shift();
    if (!next) return;

    const { el, id, startTime, projectName } = next;
    if (predecodedRef.current.has(id)) {
      runNextPredecode();
      return;
    }

    predecodeRunningRef.current = true;
    const t0 = performance.now();
    el.muted = true;
    el.volume = 0;

    const doPlay = () => {
      el.play().then(() => {
        const doPause = () => {
          predecodedRef.current.add(id);
          if (hoveredIdRef.current === id) {
            console.log(`[HoverDebug] pre-decoded (hover active) #t=${startTime}s: ${projectName}, +${(performance.now() - t0).toFixed(0)}ms`);
          } else {
            el.pause();
            console.log(`[HoverDebug] pre-decoded #t=${startTime}s: ${projectName}, currentTime=${el.currentTime.toFixed(2)}s, +${(performance.now() - t0).toFixed(0)}ms`);
          }
          predecodeRunningRef.current = false;
          runNextPredecode();
        };

        if (el.requestVideoFrameCallback) {
          el.requestVideoFrameCallback(doPause);
        } else {
          setTimeout(doPause, 100);
        }
      }).catch(() => {
        predecodeRunningRef.current = false;
        runNextPredecode();
      });
    };

    if (el.readyState >= 2) {
      doPlay();
    } else {
      el.addEventListener('canplay', doPlay, { once: true });
    }
  }, []);

  // Pause active pre-decode to yield CPU to hovered video
  const yieldToHover = useCallback(() => {
    // Just mark as not running — the active pre-decode will finish its
    // current frame decode naturally, but no new one will start until hover ends
    predecodeRunningRef.current = false;
  }, []);

  // Ref callback: register video, enqueue pre-decode, handle 404 fallbacks
  const handleVideoRef = useCallback((el, project) => {
    if (!el) return;
    const id = project._id;
    if (videoRefs.current[id] === el) return;
    videoRefs.current[id] = el;

    const hasClip = !!project.coverVideo?.clipPlaybackId;
    const { startTime } = getHoverPreviewSettings(project);

    // Clip-backed videos use preload="auto" — no pre-decode needed
    if (!hasClip && !predecodedRef.current.has(id)) {
      predecodeQueueRef.current.push({ el, id, startTime, projectName: project.name });
      runNextPredecode();
    }

    // On 404: try lower resolution fallbacks
    el.addEventListener('error', () => {
      const currentSrc = el.src;
      const frag = currentSrc.includes('#') ? currentSrc.slice(currentSrc.indexOf('#')) : '';
      const base = currentSrc.replace(frag, '');
      if (hasClip) {
        // Clip assets use high/medium/low rendition names
        if (base.endsWith('/high.mp4')) {
          console.warn(`[HoverDebug] clip high failed, trying medium: ${project.name}`);
          el.src = base.replace('/high.mp4', '/medium.mp4') + frag;
        } else if (base.endsWith('/medium.mp4')) {
          console.warn(`[HoverDebug] clip medium failed, trying low: ${project.name}`);
          el.src = base.replace('/medium.mp4', '/low.mp4') + frag;
        } else {
          failedVideosRef.current.add(id);
          console.warn(`[HoverDebug] clip renditions failed: ${project.name}`);
        }
      } else {
        // Original assets use 720p/480p/360p rendition names
        if (base.endsWith('/720p.mp4')) {
          console.warn(`[HoverDebug] 720p failed, trying 480p: ${project.name}`);
          el.src = base.replace('/720p.mp4', '/480p.mp4') + frag;
        } else if (base.endsWith('/480p.mp4')) {
          console.warn(`[HoverDebug] 480p failed, trying 360p: ${project.name}`);
          el.src = base.replace('/480p.mp4', '/360p.mp4') + frag;
        } else if (base.endsWith('/360p.mp4')) {
          console.warn(`[HoverDebug] 360p failed, trying medium.mp4: ${project.name}`);
          el.src = base.replace('/360p.mp4', '/medium.mp4') + frag;
        } else {
          failedVideosRef.current.add(id);
          console.warn(`[HoverDebug] all renditions failed: ${project.name}`);
        }
      }
    });
  }, [getHoverPreviewSettings, runNextPredecode]);

  // rAF loop for time-range looping
  useEffect(() => {
    if (!projects.videoProjects || isMobile) return;

    const loopSettings = {};
    projects.videoProjects.forEach(p => {
      const hasClip = !!p.coverVideo?.clipPlaybackId;
      if (hasClip) {
        // Clip videos are already trimmed — loop from 0 to end
        loopSettings[p._id] = { startTime: 0, endTime: null, isClip: true };
      } else {
        const settings = getHoverPreviewSettings(p);
        loopSettings[p._id] = {
          startTime: settings.startTime,
          endTime: settings.endTime != null ? settings.endTime : settings.startTime + 5,
          isClip: false,
        };
      }
    });

    const tick = () => {
      const activeId = hoveredIdRef.current;
      if (activeId) {
        const settings = loopSettings[activeId];
        if (settings && !settings.isClip) {
          const videoEl = getVideoElement(activeId);
          if (videoEl && videoEl.currentTime >= settings.endTime) {
            videoEl.currentTime = settings.startTime;
          }
        }
      }
      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [projects.videoProjects, isMobile, getVideoElement, getHoverPreviewSettings]);

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

  const shownOverlayIdRef = useRef(null);

  const showOverlay = useCallback((projectId) => {
    const prevId = shownOverlayIdRef.current;
    if (prevId && prevId !== projectId) {
      const prevOverlay = overlayRefs.current[prevId];
      if (prevOverlay) prevOverlay.style.opacity = '';
    }
    const overlay = overlayRefs.current[projectId];
    if (overlay) overlay.style.opacity = '1';
    shownOverlayIdRef.current = projectId;
    const elapsed = hoverTimestampRef.current ? (performance.now() - hoverTimestampRef.current).toFixed(1) : '?';
    console.log(`[HoverDebug] showOverlay: ${projectId}, +${elapsed}ms from hover`);
  }, []);

  const hideOverlay = useCallback((projectId) => {
    const overlay = overlayRefs.current[projectId];
    if (overlay) overlay.style.opacity = '';
    if (shownOverlayIdRef.current === projectId) {
      shownOverlayIdRef.current = null;
    }
  }, []);

  // Handle hover: play video, show overlay
  const hoverCleanupRef = useRef(null);

  useEffect(() => {
    if (isMobile) return;

    if (hoverCleanupRef.current) {
      hoverCleanupRef.current();
      hoverCleanupRef.current = null;
    }

    const activeProject = hoveredProject || touchedProject;
    const activeId = activeProject?._id || null;

    if (!activeId) {
      if (shownOverlayIdRef.current) {
        const prevVideoEl = getVideoElement(shownOverlayIdRef.current);
        if (prevVideoEl && !prevVideoEl.paused) {
          prevVideoEl.pause();
        }
        hideOverlay(shownOverlayIdRef.current);
      }
      // Resume pre-decode queue now that hover is done
      runNextPredecode();
      return;
    }

    // Yield CPU: don't start new pre-decodes while hovering
    yieldToHover();

    if (failedVideosRef.current.has(activeId)) return;

    const videoEl = videoRefs.current[activeId];
    if (!videoEl) return;

    const elapsed = hoverTimestampRef.current ? (performance.now() - hoverTimestampRef.current).toFixed(1) : '?';
    console.log(`[HoverDebug] hover effect: ${activeProject.name}, readyState=${videoEl.readyState}, predecoded=${predecodedRef.current.has(activeId)}, +${elapsed}ms`);

    // Pause previously playing video
    if (shownOverlayIdRef.current && shownOverlayIdRef.current !== activeId) {
      const prevVideoEl = getVideoElement(shownOverlayIdRef.current);
      if (prevVideoEl && !prevVideoEl.paused) {
        prevVideoEl.pause();
      }
      hideOverlay(shownOverlayIdRef.current);
    }

    videoEl.muted = true;
    videoEl.volume = 0;

    // Show overlay immediately — thumbnail stays visible underneath
    showOverlay(activeId);

    const t0 = hoverTimestampRef.current || performance.now();

    const onPlaying = () => {
      console.log(`[HoverDebug] PLAYING: ${activeProject.name}, +${(performance.now() - t0).toFixed(1)}ms`);
    };
    videoEl.addEventListener('playing', onPlaying, { once: true });

    let rvfcId = null;
    if (videoEl.requestVideoFrameCallback) {
      rvfcId = videoEl.requestVideoFrameCallback(() => {
        rvfcId = null;
        console.log(`[HoverDebug] FIRST FRAME: ${activeProject.name}, +${(performance.now() - t0).toFixed(1)}ms`);
      });
    }

    hoverCleanupRef.current = () => {
      videoEl.removeEventListener('playing', onPlaying);
      if (rvfcId !== null && videoEl.cancelVideoFrameCallback) {
        videoEl.cancelVideoFrameCallback(rvfcId);
      }
    };

    videoEl.play().catch(() => {});
  }, [hoveredProject, touchedProject, isMobile, getVideoElement, getHoverPreviewSettings, showOverlay, hideOverlay, runNextPredecode, yieldToHover]);

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
            const clipPlaybackId = project.coverVideo?.clipPlaybackId;
            const hasValidVideo = !!playbackId;
            const isMounted = mountedIds.has(project._id);
            const { startTime } = getHoverPreviewSettings(project);
            const hasClip = !!clipPlaybackId;

            return (
            <Link
              href={`/project/${project.slug}`}
              key={project._id}
              ref={el => { if (el) itemRefs.current[project._id] = el; }}
              data-project-id={project._id}
              className="w-[calc(40vw-20px)] h-[calc(40vw-20px)] md:w-[200px] md:h-[200px] flex-shrink-0 relative overflow-hidden"
              onMouseEnter={() => {
                if (!isMobile) {
                  hoverTimestampRef.current = performance.now();
                  hoveredIdRef.current = project._id;
                  const videoEl = getVideoElement(project._id);
                  console.log(`[HoverDebug] mouseEnter: ${project.name}, readyState=${videoEl?.readyState}, predecoded=${predecodedRef.current.has(project._id)}`);
                  handleProjectHover(project);
                }
              }}
              onMouseLeave={() => {
                if (!isMobile) {
                  hoveredIdRef.current = null;
                  handleProjectLeave();
                }
              }}
              onTouchStart={(e) => handleTouchStart(project, e)}
              onTouchEnd={() => handleTouchEnd()}
              onTouchCancel={() => handleTouchEnd()}
            >
              <div className="relative w-full h-full overflow-hidden">
                {project.thumbnailImage && (
                  <div
                    className="w-full h-full relative"
                    style={project.thumbnailImageBlur ? {
                      backgroundImage: `url(${project.thumbnailImageBlur})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    } : undefined}
                  >
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

                {/* Video overlay — preload="metadata" only downloads moov atom */}
                {!isMobile && hasValidVideo && isMounted && (
                  <div
                    ref={el => { if (el) overlayRefs.current[project._id] = el; }}
                    className="absolute inset-0 opacity-0"
                  >
                    <div
                      className="absolute inset-0 origin-center"
                      style={hasClip ? {} : {
                        transform: 'translate(-50%, -50%) scale(2)',
                        left: '50%',
                        top: '50%',
                        width: '100%',
                        height: '100%',
                      }}
                    >
                      <video
                        ref={el => {
                          if (el && playbackId) {
                            handleVideoRef(el, project);
                          }
                        }}
                        src={hasClip
                          ? `https://stream.mux.com/${clipPlaybackId}/high.mp4`
                          : `https://stream.mux.com/${playbackId}/720p.mp4${startTime ? `#t=${startTime}` : ''}`
                        }
                        poster={`https://image.mux.com/${playbackId}/thumbnail.jpg?time=${startTime}&width=400`}
                        muted
                        playsInline
                        loop={hasClip}
                        preload={hasClip ? 'auto' : 'metadata'}
                        style={{
                          height: '100%',
                          width: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center',
                          pointerEvents: 'none',
                          overflow: 'hidden',
                        }}
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
