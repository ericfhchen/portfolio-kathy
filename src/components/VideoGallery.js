'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import MuxPlayer from '@mux/mux-player-react'


export default function VideoGallery({ videos }) {
  const [mounted, setMounted] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerWidth, setPlayerWidth] = useState(0);
  const [playerHeight, setPlayerHeight] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [videoAspectRatio, setVideoAspectRatio] = useState('16/9');
  const [isVerticalVideo, setIsVerticalVideo] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const controlsTimeoutRef = useRef(null);
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  
  // Only run client-side code after mounting and detect iOS
  useEffect(() => {
    setMounted(true);
    
    // Check if the device is iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);
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
    
    // Reset player if it exists
    if (playerRef.current) {
      try {
        // For iOS native video element
        if (isIOS) {
          playerRef.current.currentTime = 0;
          playerRef.current.pause();
        } 
        // For MuxPlayer
        else if (playerRef.current.pause) {
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
    
    // Reset player if it exists
    if (playerRef.current) {
      try {
        // For iOS native video element
        if (isIOS) {
          playerRef.current.currentTime = 0;
          playerRef.current.pause();
        } 
        // For MuxPlayer
        else if (playerRef.current.pause) {
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

  // Reset player when video changes
  useEffect(() => {
    if (mounted && playerRef.current) {
      setIsPlaying(false);
      setProgress(0);
      
      try {
        // For iOS native video element
        if (isIOS) {
          playerRef.current.currentTime = 0;
          playerRef.current.pause();
          
          // Force poster refresh for iOS
          const posterUrl = getPosterUrl(effectiveVideos[currentVideoIndex]);
          if (posterUrl) {
            playerRef.current.poster = posterUrl;
          }
        } 
        // For MuxPlayer
        else if (playerRef.current.pause) {
          playerRef.current.pause();
        }
      } catch (e) {
        console.log("Error resetting player on video change:", e);
      }
    }
  }, [currentVideoIndex, mounted, isIOS, effectiveVideos]);

  // Add new effect to ensure thumbnails are properly initialized
  useEffect(() => {
    if (mounted && effectiveVideos.length > 0 && playerRef.current) {
      // Force thumbnail refresh on initial mount
      try {
        const currentVideo = effectiveVideos[currentVideoIndex];
        const posterUrl = getPosterUrl(currentVideo);
        
        // For iOS, we need to manually set the poster attribute
        if (isIOS && playerRef.current) {
          playerRef.current.poster = posterUrl;
        }
        
        // For MuxPlayer, we can manipulate the currentTime to ensure proper thumbnail
        if (!isIOS && playerRef.current) {
          // Update the poster time through a direct DOM access if needed
          if (playerRef.current.shadowRoot) {
            const posterImg = playerRef.current.shadowRoot.querySelector('img');
            if (posterImg && posterImg.src) {
              posterImg.src = posterUrl;
            }
          }
        }
      } catch (e) {
        console.log("Error initializing thumbnail:", e);
      }
    }
  }, [mounted, effectiveVideos, currentVideoIndex, isIOS]);

  // Measure player width when video loads or changes
  useEffect(() => {
    if (playerRef.current) {
      const updateWidth = () => {
        const width = playerRef.current.offsetWidth;
        setPlayerWidth(width);
      };

      // Initial measurement
      updateWidth();

      // Create observer to watch for size changes
      const resizeObserver = new ResizeObserver(updateWidth);
      resizeObserver.observe(playerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [currentVideoIndex, mounted]);

  // Update progress
  useEffect(() => {
    if (playerRef.current && isPlaying) {
      const updateProgress = () => {
        const currentTime = playerRef.current.currentTime;
        const duration = playerRef.current.duration;
        setProgress((currentTime / duration) * 100);
      };

      const interval = setInterval(updateProgress, 100);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  // Add a useEffect to measure the player position
  useEffect(() => {
    if (playerRef.current && containerRef.current && mounted) {
      const updatePlayerMetrics = () => {
        try {
          const containerRect = containerRef.current.getBoundingClientRect();
          const containerWidth = containerRect.width;
          const containerHeight = containerRect.height;
          
          // Parse aspect ratio for calculations
          const [aspectWidth, aspectHeight] = videoAspectRatio.split('/').map(Number);
          const aspectRatioValue = aspectWidth / aspectHeight;
          
          // Calculate the dimensions the player should have based on container and aspect ratio
          let playerWidthValue, playerHeightValue;
          
          // If container is wider than the video would be at full height
          if (containerWidth > containerHeight * aspectRatioValue) {
            // Height constrained - set height to 100% of container and calculate width
            playerHeightValue = containerHeight;
            playerWidthValue = containerHeight * aspectRatioValue;
          } else {
            // Width constrained - set width to 100% of container and calculate height
            playerWidthValue = containerWidth;
            playerHeightValue = containerWidth / aspectRatioValue;
          }
          
          // Update the state with the calculated values
          setPlayerWidth(playerWidthValue);
          setPlayerHeight(playerHeightValue);
        } catch {
          // Error measuring player
        }
      };
      
      updatePlayerMetrics();
      
      // Update metrics when window resizes
      window.addEventListener('resize', updatePlayerMetrics);
      
      // Also try with a delay to ensure the player has rendered
      const timeoutId = setTimeout(updatePlayerMetrics, 300);
      
      // Also update when player changes dimensions
      const resizeObserver = new ResizeObserver(updatePlayerMetrics);
      if (playerRef.current) {
        resizeObserver.observe(playerRef.current);
      }
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }
      
      return () => {
        window.removeEventListener('resize', updatePlayerMetrics);
        clearTimeout(timeoutId);
        resizeObserver.disconnect();
      };
    }
  }, [mounted, currentVideoIndex, isPlaying, videoAspectRatio]);

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

  // Handle controls visibility
  useEffect(() => {
    if (mounted) {
      const startControlsTimer = () => {
        // Clear any existing timeout
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
        
        // Show controls
        setShowControls(true);
        
        // Set timeout to hide controls after 3 seconds
        controlsTimeoutRef.current = setTimeout(() => {
          if (isPlaying) {
            setShowControls(false);
          }
        }, 3000);
      };
      
      // Start the timer initially
      startControlsTimer();
      
      // Add event listeners for mouse movement and hover
      const handleMouseMove = () => {
        startControlsTimer();
      };
      
      // Capture current ref value to use in cleanup
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
    }
  }, [mounted, isPlaying]);
  
  // Reset controls visibility when play state changes
  useEffect(() => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

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
    
    // First check direct poster property
    if (video?.asset?.poster) return video.asset.poster;
    
    // Check thumbTime at the asset root level
    if (video?.asset?.thumbTime !== undefined) {
      return `https://image.mux.com/${video.asset.playbackId}/thumbnail.jpg?time=${video.asset.thumbTime}&width=960`;
    }
    
    // Check thumbTime in data object
    if (video?.asset?.data?.thumbTime !== undefined) {
      return `https://image.mux.com/${video.asset.playbackId}/thumbnail.jpg?time=${video.asset.data.thumbTime}&width=960`;
    }
    
    // Check for thumbnail_time in data (another possible format)
    if (video?.asset?.data?.thumbnail_time !== undefined) {
      return `https://image.mux.com/${video.asset.playbackId}/thumbnail.jpg?time=${video.asset.data.thumbnail_time}&width=960`;
    }
    
    // Additional check for Sanity MUX custom thumbnail time location
    // Sometimes Sanity stores it nested under data.playback_ids
    if (video?.asset?.data?.playback_ids?.[0]?.time !== undefined) {
      return `https://image.mux.com/${video.asset.playbackId}/thumbnail.jpg?time=${video.asset.data.playback_ids[0].time}&width=960`;
    }
    
    // Use first frame (time=0) as backup when no specific thumbnail time exists
    // Include width parameter for high quality
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
          className="w-[100vw] h-[85vh] md:w-[75vw] md:h-[75vh] flex items-center justify-center"
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
                  {isIOS ? (
                    // Use native HTML5 video for iOS with Safari's built-in controls
                    <video
                      ref={playerRef}
                      src={`https://stream.mux.com/${playbackId}.m3u8`}
                      poster={posterUrl}
                      playsInline
                      controls
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
                      onPlay={() => {
                        setIsPlaying(true);
                      }}
                      onPause={() => setIsPlaying(false)}
                      onVolumeChange={(e) => setIsMuted(e.target.muted)}
                    />
                  ) : (
                    // Use MuxPlayer for non-iOS devices
                    <MuxPlayer
                      ref={playerRef}
                      playbackId={playbackId}
                      streamType="on-demand"
                      title=" "
                      accentColor='#000'
                      primaryColor='#ffffff'
                      secondaryColor='#000000'
                      autoPlay={false}
                      muted={false}
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
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
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
                        width: '100%',
                        background: isFullscreen ? 'rgba(0, 0, 0, 0.5)' : 'transparent',
                        borderRadius: isFullscreen ? '5px' : '0',
                        padding: isFullscreen ? '10px' : undefined,
                        opacity: showControls ? 1 : 0,
                        pointerEvents: showControls ? 'auto' : 'none'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePlay();
                          }}
                          className="text-white hover:opacity-60 transition-opacity w-10 text-center tracking-wide"
                        >
                          {isPlaying ? 'PAUSE' : 'PLAY'}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMute();
                          }}
                          className="text-white hover:opacity-60 w-10 text-center transition-opacity tracking-wide"
                        >
                          {isMuted ? 'UNMUTE' : 'MUTE'}
                        </button>
                      </div>
                      <div 
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProgressClick(e);
                        }}
                        style={{
                          position: 'relative',
                          height: '100%',
                          padding: '4px 0',
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center'
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
                          toggleFullscreen();
                        }}
                        className="text-white hover:opacity-60 transition-opacity tracking-wide"
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