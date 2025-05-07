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
          const playerRect = playerRef.current.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();
          
          // Calculate the distance from the bottom of the container to the bottom of the player
          const bottomOffset = containerRect.bottom - playerRect.bottom;
          
          setPlayerWidth(playerRect.width);
          setPlayerHeight(playerRect.height);
          setPlayerBottom(bottomOffset);
        } catch (e) {
          console.error("Error measuring player:", e);
        }
      };
      
      updatePlayerMetrics();
      
      // Update metrics when window resizes
      window.addEventListener('resize', updatePlayerMetrics);
      
      // Also try with a delay to ensure the player has rendered
      const timeoutId = setTimeout(updatePlayerMetrics, 300);
      
      return () => {
        window.removeEventListener('resize', updatePlayerMetrics);
        clearTimeout(timeoutId);
      };
    }
  }, [mounted, currentVideoIndex, playerRef.current, containerRef.current]);

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
    if (playerRef.current) {
      if (!isFullscreen) {
        playerRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
      setIsFullscreen(!isFullscreen);
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
  
  // Convert aspect ratio from "16:9" format to "16/9" for CSS
  const aspectRatio = currentVideo?.asset?.data?.aspect_ratio?.replace(':', '/') || '16/9';
  const [width, height] = currentVideo?.asset?.data?.aspect_ratio?.split(':').map(Number) || [16, 9];
  const isVerticalVideo = height > width;
  
  return (
    <div className="video-gallery">
      {/* Videos gallery - one video at a time with navigation */}
      <div className="fixed inset-0 flex items-center justify-center">
        <div 
          className="w-[100vw] h-[85vh] md:w-[75vw] md:h-[75vh] flex items-center justify-center"
        >
          <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
            {mounted && (
              <>
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
                    aspectRatio: aspectRatio,
                    position: 'relative',
                    zIndex: 1,
                    boxSizing: 'content-box',
                    ...(isVerticalVideo 
                      ? { 
                          height: window.innerWidth <= 1024 ? 'auto' : '100%',
                          width: window.innerWidth <= 1024 ? '100%' : 'auto',
                          maxWidth: '100%'
                        } 
                      : { 
                          width: '100%',
                          height: 'auto',
                          maxHeight: '100%'
                        }
                    )
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
                    width: playerWidth > 0 ? `${playerWidth}px` : '100%',
                    height: playerHeight > 0 ? `${playerHeight}px` : '100%',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto',
                    background: 'transparent',
                    boxSizing: 'content-box',
                    padding: '1px' // Slight padding to cover any gap
                  }}
                />
                
                {/* Custom Controls */}
                <div 
                  className="controls-container absolute z-10 flex items-center gap-4 p-4 w-full"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    bottom: `${playerBottom}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: playerWidth > 0 ? `${playerWidth}px` : '100%',
                    maxWidth: '100%'
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
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Caption if available */}
      {currentVideo.caption && mounted && (
        <div className="fixed bottom-12 left-0 right-0 text-center">
          <p className="text-sm">{currentVideo.caption}</p>
        </div>
      )}
      
      {/* Navigation buttons - only show if there's more than one video */}
      {effectiveVideos.length > 1 && mounted && (
        <div className="fixed bottom-0 left-0 right-0 mb-2.5 flex justify-center gap-8">
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