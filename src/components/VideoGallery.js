'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import MuxPlayer from '@mux/mux-player-react'


export default function VideoGallery({ videos }) {
  const [mounted, setMounted] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Changed to true for muted by default
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerWidth, setPlayerWidth] = useState(0);
  const [playerHeight, setPlayerHeight] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [videoAspectRatio, setVideoAspectRatio] = useState('16/9');
  const [isVerticalVideo, setIsVerticalVideo] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const lastCurrentTimeRef = useRef(0); // Track previous currentTime — ref to avoid re-creating intervals
  const progressRef = useRef(0); // Track progress as ref too for the same reason
  const hasReallyStartedRef = useRef(false); // True once video has played past the HLS buffering phase
  const consecutiveForwardRef = useRef(0); // Count consecutive forward ticks to detect real playback
  const wallClockStartRef = useRef(null); // Wall-clock time when real playback started
  const startTimeOffsetRef = useRef(0); // currentTime when real playback started
  const maxCurrentTimeRef = useRef(0); // Highest currentTime ever observed (for syncing)
  const canPlayTimeRef = useRef(null); // Wall-clock time when onCanPlay fired
  const stalledRef = useRef(false); // Set true on onWaiting/onStalled, cleared by progress ticks
  const controlsTimeoutRef = useRef(null);
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  
  const [isSafariDesktop, setIsSafariDesktop] = useState(false);

  // Only run client-side code after mounting and detect iOS / Safari
  useEffect(() => {
    setMounted(true);

    // Check if the device is iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Detect desktop Safari (Safari but not iOS)
    const isSafari = /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);
    setIsSafariDesktop(isSafari && !isIOSDevice);
  }, [videos]);

  // Use useMemo to calculate effective videos that won't change on every render
  const effectiveVideos = useMemo(() => {
    // Filter out invalid videos (those without a playback ID)
    const validVideos = videos?.filter(video => {
      if (!video?.asset) return false;
      // Check for playbackId in the expected location for Mux videos
      return !!video.asset.playbackId;
    }) || [];

    // Return only valid videos, no fallback to coverVideo
    return validVideos;
  }, [videos]);

  // Use useCallback to memoize navigation functions
  const goToNextVideo = useCallback(() => {
    if (!effectiveVideos || effectiveVideos.length === 0) return;
    
    setCurrentVideoIndex((prev) => 
      prev === effectiveVideos.length - 1 ? 0 : prev + 1
    );
    setIsPlaying(false);
    setProgress(0);
    lastCurrentTimeRef.current = 0;
    progressRef.current = 0;
    hasReallyStartedRef.current = false;
    consecutiveForwardRef.current = 0;
    wallClockStartRef.current = null;
    startTimeOffsetRef.current = 0;
    maxCurrentTimeRef.current = 0;
    canPlayTimeRef.current = null;
    stalledRef.current = false;
    setIsVideoLoading(true);

    // Reset player if it exists
    if (playerRef.current) {
      try {
        if (isIOS) {
          playerRef.current.currentTime = 0;
          playerRef.current.pause();
        } else if (playerRef.current.pause) {
          playerRef.current.pause();
        }
      } catch (e) {
        console.log("Error resetting player:", e);
      }
    }
  }, [effectiveVideos, isIOS]);

  const goToPrevVideo = useCallback(() => {
    if (!effectiveVideos || effectiveVideos.length === 0) return;

    setCurrentVideoIndex((prev) =>
      prev === 0 ? effectiveVideos.length - 1 : prev - 1
    );
    setIsPlaying(false);
    setProgress(0);
    lastCurrentTimeRef.current = 0;
    progressRef.current = 0;
    hasReallyStartedRef.current = false;
    consecutiveForwardRef.current = 0;
    wallClockStartRef.current = null;
    startTimeOffsetRef.current = 0;
    maxCurrentTimeRef.current = 0;
    canPlayTimeRef.current = null;
    stalledRef.current = false;
    setIsVideoLoading(true);

    // Reset player if it exists
    if (playerRef.current) {
      try {
        if (isIOS) {
          playerRef.current.currentTime = 0;
          playerRef.current.pause();
        } else if (playerRef.current.pause) {
          playerRef.current.pause();
        }
      } catch (e) {
        console.log("Error resetting player:", e);
      }
    }
  }, [effectiveVideos, isIOS]);
  
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    // For iOS Safari: need to access the video element directly
    if (playerRef.current) {
      const videoElement = playerRef.current.querySelector('video');
      
      if (videoElement) {
        // iOS Safari
        if (!isFullscreen && videoElement.webkitEnterFullscreen) {
          videoElement.webkitEnterFullscreen();
          return;
        } else if (isFullscreen && videoElement.webkitExitFullscreen) {
          videoElement.webkitExitFullscreen();
          return;
        }
      }
    }
    
    // Standard fullscreen API for other browsers
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      } else if (containerRef.current.msRequestFullscreen) {
        containerRef.current.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }, [isFullscreen]);

  // Reset progress state when video changes — autoPlay on the player handles playback
  useEffect(() => {
    if (mounted) {
      setIsPlaying(false);
      setProgress(0);
      lastCurrentTimeRef.current = 0;
      progressRef.current = 0;
      hasReallyStartedRef.current = false;
    consecutiveForwardRef.current = 0;
    wallClockStartRef.current = null;
    startTimeOffsetRef.current = 0;
    maxCurrentTimeRef.current = 0;
    canPlayTimeRef.current = null;
    stalledRef.current = false;
    setIsVideoLoading(true);

      // For native video (iOS + Safari desktop), we need to manually reset since it doesn't re-mount
      if ((isIOS || isSafariDesktop) && playerRef.current) {
        try {
          playerRef.current.currentTime = 0;
          playerRef.current.muted = true;
          setIsMuted(true);
          const posterUrl = getPosterUrl(effectiveVideos[currentVideoIndex]);
          if (posterUrl) {
            playerRef.current.poster = posterUrl;
          }
          playerRef.current.play().catch(() => {});
        } catch {
          // Error resetting native player
        }
      }
    }
  }, [currentVideoIndex, mounted, isIOS, isSafariDesktop, effectiveVideos]);

  // Add new effect to ensure thumbnails are properly initialized
  useEffect(() => {
    // Thumbnail init effect
    if (mounted && effectiveVideos.length > 0 && playerRef.current) {
      try {
        const currentVideo = effectiveVideos[currentVideoIndex];
        const posterUrl = getPosterUrl(currentVideo);

        if ((isIOS || isSafariDesktop) && playerRef.current) {
          playerRef.current.poster = posterUrl;
        }

        if (!isIOS && !isSafariDesktop && playerRef.current) {
          if (playerRef.current.shadowRoot) {
            const posterImg = playerRef.current.shadowRoot.querySelector('img');
            if (posterImg && posterImg.src) {
              posterImg.src = posterUrl;
            }
          }
        }
      } catch {
        // Error initializing thumbnail
      }
    }
  }, [mounted, effectiveVideos, currentVideoIndex, isIOS, isSafariDesktop]);

  // No separate first-autoplay effect needed — autoPlay={true} on MuxPlayer handles it
  // For iOS, the video-change effect above handles the first video too (currentVideoIndex starts at 0)

  // Detect real playback using requestVideoFrameCallback — fires only when actual frames render.
  // This is the only reliable signal on Safari, where HLS reports phantom currentTime values.
  useEffect(() => {
    if (!mounted || hasReallyStartedRef.current) return;

    let frameCallbackId = null;
    let cancelled = false;

    const findVideoElement = () => {
      if (!playerRef.current) return null;
      const el = playerRef.current;

      // If the ref IS the video element (native <video> path for Safari)
      if (el.nodeName === 'VIDEO') return el;

      // Try multiple access patterns for MuxPlayer's underlying <video>
      // 1. Direct query (light DOM)
      let video = el.querySelector?.('video');
      if (video) return video;

      video = el.shadowRoot?.querySelector?.('video');
      if (video) return video;

      const media = el.media || el.mediaEl;
      if (media?.nodeName === 'VIDEO') return media;
      if (media?.shadowRoot) {
        video = media.shadowRoot.querySelector?.('video');
        if (video) return video;
      }

      const muxVideo = el.shadowRoot?.querySelector?.('mux-video');
      if (muxVideo?.shadowRoot) {
        video = muxVideo.shadowRoot.querySelector?.('video');
        if (video) return video;
      }

      return null;
    };

    const FRAMES_NEEDED = 2; // 2 distinct advancing frames confirms real playback (mediaTime=0 is poster)
    let frameCount = 0;
    let lastMediaTime = -1;

    const onFrame = (now, metadata) => {
      if (cancelled || hasReallyStartedRef.current) return;
      const videoEl = findVideoElement();
      if (!videoEl) return;

      const mt = metadata?.mediaTime ?? metadata?.presentationTime ?? now;

      if (mt > lastMediaTime && lastMediaTime >= 0) {
        frameCount++;
        lastMediaTime = mt;
      } else if (lastMediaTime < 0) {
        lastMediaTime = mt; // first frame, just record
      } else if (mt < lastMediaTime) {
        frameCount = 0; // backward jump — reset
        lastMediaTime = mt;
      }
      // mt == lastMediaTime → same frame repainted, skip (don't reset or count)

      if (frameCount >= FRAMES_NEEDED) {
        const ct = playerRef.current?.currentTime || mt;
        hasReallyStartedRef.current = true;
        wallClockStartRef.current = performance.now();
        startTimeOffsetRef.current = ct;
        maxCurrentTimeRef.current = ct;
        lastCurrentTimeRef.current = ct;
        setIsVideoLoading(false);
        return;
      }

      // Keep waiting for more frames
      frameCallbackId = videoEl.requestVideoFrameCallback(onFrame);
    };

    const waitForFrame = () => {
      const videoEl = findVideoElement();
      if (!videoEl || cancelled) return;

      if (videoEl.requestVideoFrameCallback) {
        frameCallbackId = videoEl.requestVideoFrameCallback(onFrame);
      } else {
        // Fallback: just clear loading after canPlayThrough fires
        hasReallyStartedRef.current = true;
        setIsVideoLoading(false);
      }
    };

    // Try immediately, and retry periodically until the video element is available
    const retryInterval = setInterval(() => {
      if (cancelled || hasReallyStartedRef.current) {
        clearInterval(retryInterval);
        return;
      }
      waitForFrame();
    }, 100);

    waitForFrame();

    return () => {
      cancelled = true;
      clearInterval(retryInterval);
      const videoEl = findVideoElement();
      if (videoEl && frameCallbackId != null && videoEl.cancelVideoFrameCallback) {
        videoEl.cancelVideoFrameCallback(frameCallbackId);
      }
    };
  }, [mounted, currentVideoIndex]);

  // Update progress using wall-clock interpolation (Safari HLS currentTime oscillates)
  useEffect(() => {
    if (playerRef.current && isPlaying && hasReallyStartedRef.current) {
      const updateProgress = () => {
        if (!playerRef.current || !wallClockStartRef.current) return;
        const currentTime = playerRef.current.currentTime;
        const duration = playerRef.current.duration;

        if (!duration || isNaN(duration) || duration <= 0 || duration >= 86400) return;

        const wallElapsed = (performance.now() - wallClockStartRef.current) / 1000;
        const estimatedTime = startTimeOffsetRef.current + wallElapsed;

        maxCurrentTimeRef.current = Math.max(maxCurrentTimeRef.current, currentTime);

        const effectiveTime = Math.min(
          Math.max(estimatedTime, maxCurrentTimeRef.current),
          duration
        );

        if (effectiveTime >= lastCurrentTimeRef.current) {
          const newProgress = (effectiveTime / duration) * 100;
          progressRef.current = newProgress;
          lastCurrentTimeRef.current = effectiveTime;
          setProgress(Math.min(newProgress, 100));
        }
      };

      const interval = setInterval(updateProgress, 100);
      return () => clearInterval(interval);
    }
  }, [isPlaying, isVideoLoading]);

  // Measure player dimensions based on container and aspect ratio
  useEffect(() => {
    if (!playerRef.current || !containerRef.current || !mounted) return;

    const updatePlayerMetrics = () => {
      try {
        const containerRect = containerRef.current.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;

        const [aspectWidth, aspectHeight] = videoAspectRatio.split('/').map(Number);
        const aspectRatioValue = aspectWidth / aspectHeight;

        let playerWidthValue, playerHeightValue;

        if (containerWidth > containerHeight * aspectRatioValue) {
          playerHeightValue = containerHeight;
          playerWidthValue = containerHeight * aspectRatioValue;
        } else {
          playerWidthValue = containerWidth;
          playerHeightValue = containerWidth / aspectRatioValue;
        }

        setPlayerWidth(playerWidthValue);
        setPlayerHeight(playerHeightValue);
      } catch {
        // Error measuring player
      }
    };

    updatePlayerMetrics();

    window.addEventListener('resize', updatePlayerMetrics);
    const timeoutId = setTimeout(updatePlayerMetrics, 300);

    const resizeObserver = new ResizeObserver(updatePlayerMetrics);
    resizeObserver.observe(playerRef.current);
    resizeObserver.observe(containerRef.current);

    return () => {
      window.removeEventListener('resize', updatePlayerMetrics);
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [mounted, currentVideoIndex, videoAspectRatio]);

  // Add event listeners for fullscreen changes and keyboard shortcuts
  useEffect(() => {
    if (!mounted) return;
    
    const handleFullscreenChange = () => {
      const isDocumentFullscreen = document.fullscreenElement !== null;
      setIsFullscreen(isDocumentFullscreen);
    };
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      } else if (e.key === ' ' || e.key === 'k') {
        // Space or K key for play/pause
        if (playerRef.current) {
          if (playerRef.current.paused) {
            playerRef.current.play();
            setIsPlaying(true);
          } else {
            playerRef.current.pause();
            setIsPlaying(false);
          }
        }
      } else if (e.key === 'f' || e.key === 'F') {
        // F key to enter fullscreen
        if (!isFullscreen && containerRef.current) {
          toggleFullscreen();
        }
      } else if (e.key === 'ArrowRight') {
        // Right arrow key to navigate to next video
        goToNextVideo();
      } else if (e.key === 'ArrowLeft') {
        // Left arrow key to navigate to previous video
        goToPrevVideo();
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mounted, isFullscreen, goToNextVideo, goToPrevVideo, toggleFullscreen]);

  // Handle controls visibility (show on mouse move, hide after 3s when playing)
  // Always visible during loading; stay visible 1s after loading clears
  useEffect(() => {
    if (!mounted) return;

    const startControlsTimer = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      setShowControls(true);
      if (isPlaying && !isVideoLoading) {
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
    };

    startControlsTimer();

    const handleMouseMove = () => startControlsTimer();
    const currentContainer = containerRef.current;

    if (currentContainer) {
      currentContainer.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (currentContainer) {
        currentContainer.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [mounted, isPlaying, isVideoLoading]);

  // Update aspect ratio when current video changes
  useEffect(() => {
    if (mounted && effectiveVideos.length > 0 && currentVideoIndex < effectiveVideos.length) {
      const currentVideo = effectiveVideos[currentVideoIndex];
      
      // Convert aspect ratio from "16:9" format to "16/9" for CSS
      const newAspectRatio = currentVideo?.asset?.data?.aspect_ratio?.replace(':', '/') || '16/9';
      setVideoAspectRatio(newAspectRatio);
      
      // Check if it's a vertical video
      const [width, height] = currentVideo?.asset?.data?.aspect_ratio?.split(':').map(Number) || [16, 9];
      setIsVerticalVideo(height > width);
    }
  }, [mounted, currentVideoIndex, effectiveVideos]);
  
  const togglePlay = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause();
        setIsPlaying(false);
      } else {
        playerRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    if (playerRef.current) {
      playerRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleProgressClick = (e) => {
    if (playerRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = (x / rect.width) * 100;
      const newTime = (percentage / 100) * playerRef.current.duration;
      playerRef.current.currentTime = newTime;
      // Reset refs to allow seeking; mark as started
      lastCurrentTimeRef.current = newTime;
      progressRef.current = percentage;
      hasReallyStartedRef.current = true;
      wallClockStartRef.current = performance.now();
      startTimeOffsetRef.current = newTime;
      maxCurrentTimeRef.current = newTime;
      setIsVideoLoading(false);
      setProgress(percentage);
    }
  };

  // If there are no valid videos, display a message
  if (!effectiveVideos || effectiveVideos.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        No videos available. Please add videos in Sanity Studio.
      </div>
    );
  }
  
  // Get the current video
  const currentVideo = effectiveVideos[currentVideoIndex];
  const playbackId = currentVideo?.asset?.playbackId;
  
  // Determine the poster URL based on available thumbnail data
  const getPosterUrl = (video) => {
    if (!video?.asset?.playbackId) return undefined;
    
    // Always use time 0 for thumbnails to prevent preview stuttering
    // This ensures the thumbnail matches the actual video start frame
    return `https://image.mux.com/${video.asset.playbackId}/thumbnail.jpg?time=0&width=960`;
  };
  
  const posterUrl = getPosterUrl(currentVideo);
  
  if (!playbackId) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        Video playback ID not available
      </div>
    );
  }
  
  return (
    <div className="video-gallery">
      {/* Videos gallery - one video at a time with navigation */}
      <div className="fixed inset-0 flex items-center justify-center">
        <div 
          className="w-[100vw]
          h-[75svh]                                   
          [@supports(height:75dvh)]:h-[75dvh]         
          [@supports(not(height:75svh))]:h-[75vh]
          md:w-[75vw] md:h-[75vh] flex items-center justify-center"
        >
          <div 
            ref={containerRef} 
            className="relative w-full h-full flex items-center justify-center" 
            onMouseEnter={() => !isIOS && setShowControls(true)}
            onMouseLeave={() => {
              if (!isIOS && isPlaying) {
                // Only hide controls on mouse leave if video is playing
                if (controlsTimeoutRef.current) {
                  clearTimeout(controlsTimeoutRef.current);
                }
                controlsTimeoutRef.current = setTimeout(() => {
                  setShowControls(false);
                }, 3000);
              }
            }}
            style={{
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              height: '100%',
              background: isFullscreen ? 'black' : 'transparent',
            }}
          >
            {mounted && (
              <>
                <div
                  className={`relative ${isVerticalVideo ? 'vertical-video' : ''}`}
                  style={{
                    width: isFullscreen ? '100%' : `${playerWidth}px`,
                    height: isFullscreen ? '100%' : `${playerHeight}px`,
                    position: 'relative',
                    maxWidth: '100%',
                    maxHeight: '100%',
                  }}
                >
                  {(isIOS || isSafariDesktop) ? (
                    // Use native HTML5 video for Safari (iOS + desktop) to avoid
                    // MuxPlayer's HLS handling which causes a ~3s buffering pause
                    // on Safari due to ABR quality switching.
                    <video
                      ref={playerRef}
                      src={`https://stream.mux.com/${playbackId}.m3u8`}
                      poster={posterUrl}
                      playsInline
                      {...(isIOS ? { controls: true } : {})}
                      autoPlay
                      muted
                      preload="auto"
                      style={{
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        width: '100%',
                        height: '100%',
                        zIndex: 1,
                        objectFit: 'contain',
                        backgroundColor: 'transparent',
                      }}
                      onCanPlay={() => {
                        if (!canPlayTimeRef.current) {
                          canPlayTimeRef.current = performance.now();
                        }
                      }}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onWaiting={() => { stalledRef.current = true; }}
                      onStalled={() => { stalledRef.current = true; }}
                      onVolumeChange={(e) => setIsMuted(e.target.muted)}
                    />
                  ) : (
                    // Use MuxPlayer for non-Safari browsers (Chrome, Firefox, etc.)
                    <MuxPlayer
                      ref={playerRef}
                      playbackId={playbackId}
                      streamType="on-demand"
                      title=" "
                      accentColor='#000'
                      primaryColor='#ffffff'
                      secondaryColor='#000000'
                      autoPlay={true}
                      muted={true}
                      loop={false}
                      poster={posterUrl}
                      preload="auto"
                      defaultHiddenCaptions
                      defaultPosterTime={0}
                      thumbnailTime={0}
                      metadata={{
                        video_title: currentVideo?.caption || "",
                        player_name: "Portfolio Gallery"
                      }}
                      style={{
                        '--controls': 'none',
                        '--media-object-fit': 'contain',
                        '--media-object-position': 'center',
                        '--poster-object-fit': 'contain',
                        '--poster-object-position': 'center',
                        '--media-background-color': 'transparent',
                        '--poster-background-color': 'transparent',
                        '--placeholder-background-display': 'none',
                        '--media-element-container-display': 'block',
                        aspectRatio: videoAspectRatio,
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        width: '100%',
                        height: '100%',
                        zIndex: 1,
                        boxSizing: 'border-box',
                        objectFit: 'contain',
                      }}
                      onCanPlay={() => {
                        if (!canPlayTimeRef.current) {
                          canPlayTimeRef.current = performance.now();
                        }
                      }}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onWaiting={() => { stalledRef.current = true; }}
                      onStalled={() => { stalledRef.current = true; }}
                      onMuted={() => setIsMuted(true)}
                      onUnmuted={() => setIsMuted(false)}
                      onEnterFullscreen={() => setIsFullscreen(true)}
                      onExitFullscreen={() => setIsFullscreen(false)}
                    />
                  )}
                  
                  {/* Click overlay for play/pause - only show when not on iOS */}
                  {!isIOS && (
                    <div 
                      className="absolute cursor-pointer z-[2]"
                      onClick={(e) => {
                        // Don't toggle play if clicking on the controls container
                        if (!e.target.closest('.controls-container')) {
                          togglePlay();
                        }
                      }}
                      style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        top: '0',
                        left: '0',
                        pointerEvents: 'auto',
                        background: 'transparent',
                      }}
                    />
                  )}
                  
                  {/* Custom Controls - only show when not on iOS */}
                  {!isIOS && (
                    <div 
                      className={`controls-container absolute z-10 flex items-center gap-4 ${isFullscreen ? '' : 'p-4'} w-full transition-opacity duration-300 ease-in-out`}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        display: 'grid',
                        gridTemplateColumns: 'auto auto 1fr auto',
                        gap: '0.5rem',
                        alignItems: 'center',
                        padding: isFullscreen ? '10px' : '12px',
                        background: 'transparent',
                        borderRadius: isFullscreen ? '5px' : '0',
                        opacity: showControls ? 1 : 0,
                        pointerEvents: showControls ? 'auto' : 'none'
                      }}
                    >
                      {isVideoLoading ? (
                        <span
                          className="text-center tracking-wide whitespace-nowrap"
                          style={{ minWidth: '40px', gridColumn: 'span 2', color: 'rgba(255, 255, 255, 0.3)' }}
                        >
                          LOADING
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePlay();
                            }}
                            className="text-white hover:opacity-60 transition-opacity text-center tracking-wide whitespace-nowrap"
                            style={{ minWidth: '40px' }}
                          >
                            {isPlaying ? 'PAUSE' : 'PLAY'}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMute();
                            }}
                            className="text-white hover:opacity-60 text-center transition-opacity tracking-wide whitespace-nowrap"
                            style={{ minWidth: '40px' }}
                          >
                            {isMuted ? 'UNMUTE' : 'MUTE'}
                          </button>
                        </>
                      )}

                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isVideoLoading) handleProgressClick(e);
                        }}
                        style={{
                          position: 'relative',
                          height: '100%',
                          padding: '4px 0',
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: isVideoLoading ? 'default' : 'pointer',
                          opacity: isVideoLoading ? 0.3 : 1,
                          transition: 'opacity 0.3s ease'
                        }}
                      >
                        <div
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                            height: '4px',
                            width: '100%',
                            position: 'relative'
                          }}
                        >
                          <div
                            className="bg-white"
                            style={{
                              width: `${progress}%`,
                              height: '4px',
                              transition: 'width 0.1s linear'
                            }}
                          />
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isVideoLoading) toggleFullscreen();
                        }}
                        className="text-white transition-opacity tracking-wide whitespace-nowrap"
                        style={{ opacity: isVideoLoading ? 0.3 : 1 }}
                        onMouseEnter={(e) => { if (!isVideoLoading) e.currentTarget.style.opacity = '0.6'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = isVideoLoading ? '0.3' : '1'; }}
                      >
                        {isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Caption if available */}
      {currentVideo?.caption && mounted && !isIOS && (
        <div 
          className="fixed bottom-12 left-0 right-0 text-center transition-opacity duration-300 ease-in-out"
          style={{
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? 'auto' : 'none'
          }}
        >
          <p className="text-sm">{currentVideo.caption}</p>
        </div>
      )}
      
      {/* Navigation buttons - always visible */}
      {effectiveVideos.length > 1 && mounted && (
        <div 
          className="fixed bottom-0 left-0 right-0 mb-2.5 flex justify-center gap-8 transition-opacity duration-300 ease-in-out"
          style={{
            opacity: 1,
            pointerEvents: 'auto'
          }}
        >
          <button 
            onClick={goToPrevVideo} 
            className="uppercase hover:opacity-60 transition-opacity leading-[1] px-1"
          >
            Prev
          </button>
          <button 
            onClick={goToNextVideo} 
            className="uppercase hover:opacity-60 transition-opacity leading-[1] px-1"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
} 