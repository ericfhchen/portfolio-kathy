'use client'

import { useState, useEffect, useRef } from 'react'
import MuxPlayer from '@mux/mux-player-react'


export default function VideoGallery({ videos, name, coverVideo }) {
  const [mounted, setMounted] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerWidth, setPlayerWidth] = useState(0);
  const [playerHeight, setPlayerHeight] = useState(0);
  const [playerBottom, setPlayerBottom] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [videoAspectRatio, setVideoAspectRatio] = useState('16/9');
  const [isVerticalVideo, setIsVerticalVideo] = useState(false);
  const controlsTimeoutRef = useRef(null);
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  
  // Only run client-side code after mounting
  useEffect(() => {
    setMounted(true);
  }, [videos, coverVideo]);

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
          
          // We no longer need playerBottom since controls are inside the player wrapper
          setPlayerBottom(0);
        } catch (e) {
          console.error("Error measuring player:", e);
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
    if (mounted) {
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
              // Also unmute if currently muted
              if (isMuted) {
                playerRef.current.muted = false;
                setIsMuted(false);
              }
              setIsPlaying(true);
            } else {
              playerRef.current.pause();
              setIsPlaying(false);
            }
          }
        }
      };
      
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [mounted, isFullscreen, isMuted]);

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
      
      if (containerRef.current) {
        containerRef.current.addEventListener('mousemove', handleMouseMove);
      }
      
      return () => {
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
        if (containerRef.current) {
          containerRef.current.removeEventListener('mousemove', handleMouseMove);
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

  // Filter out invalid videos (those without a playback ID)
  const validVideos = videos?.filter(video => {
    if (!video?.asset) return false;
    // Check for playbackId in the expected location for Mux videos
    return !!video.asset.playbackId;
  }) || [];
  
  // If no valid videos but we have a cover video, use that instead
  const effectiveVideos = validVideos.length > 0 
    ? validVideos 
    : (coverVideo && coverVideo.playbackId ? [{ asset: coverVideo, caption: name }] : []);
  
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
  
  const goToNextVideo = () => {
    if (effectiveVideos && effectiveVideos.length > 0) {
      setCurrentVideoIndex((prev) => 
        prev === effectiveVideos.length - 1 ? 0 : prev + 1
      );
      setIsPlaying(false);
      setProgress(0);
    }
  };
  
  const goToPrevVideo = () => {
    if (effectiveVideos && effectiveVideos.length > 0) {
      setCurrentVideoIndex((prev) => 
        prev === 0 ? effectiveVideos.length - 1 : prev - 1
      );
      setIsPlaying(false);
      setProgress(0);
    }
  };
  
  const togglePlay = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
        // Unmute video if it's currently muted when playing
        if (isMuted) {
          playerRef.current.muted = false;
          setIsMuted(false);
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (playerRef.current) {
      playerRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
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
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => {
              if (isPlaying) {
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
                  className="relative"
                  style={{
                    width: isFullscreen ? '100%' : `${playerWidth}px`,
                    height: isFullscreen ? '100%' : `${playerHeight}px`,
                    position: 'relative',
                    maxWidth: '100%',
                    maxHeight: '100%',
                  }}
                >
                  <MuxPlayer
                    ref={playerRef}
                    playbackId={playbackId}
                    streamType="on-demand"
                    title=" "
                    accentColor='#000'
                    primaryColor='#ffffff'
                    secondaryColor='#000000'
                    loop
                    muted
                    style={{
                      '--controls': 'none',
                      '--media-object-fit': 'contain',
                      '--media-object-position': 'center',
                      '--poster-object-fit': 'contain', 
                      '--poster-object-position': 'center',
                      '--media-background-color': 'transparent',
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
                  />
                  
                  {/* Click overlay for play/pause */}
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
                  
                  {/* Custom Controls */}
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
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Caption if available */}
      {currentVideo.caption && mounted && (
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
      
      {/* Navigation buttons - only show if there's more than one video */}
      {effectiveVideos.length > 1 && mounted && (
        <div 
          className="fixed bottom-0 left-0 right-0 mb-2.5 flex justify-center gap-8 transition-opacity duration-300 ease-in-out"
          style={{
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? 'auto' : 'none'
          }}
        >
          <button 
            onClick={goToPrevVideo} 
            className="uppercase hover:opacity-60 transition-opacity leading-[1]"
          >
            Prev
          </button>
          <button 
            onClick={goToNextVideo} 
            className="uppercase hover:opacity-60 transition-opacity leading-[1]"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
} 