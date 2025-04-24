'use client'

import Link from 'next/link'
import { useGalleryContext } from './GalleryContext'
import { useState, useRef, useEffect, useCallback } from 'react'
import Mux from '@mux/mux-player-react'

export default function BottomGallery() {
  const { projects, hoveredProject, handleProjectHover, handleProjectLeave } = useGalleryContext()
  const videoRefs = useRef({});
  const [videosInitialized, setVideosInitialized] = useState({});
  const playerRef = useRef(null);

  // Debug logging
  useEffect(() => {
    if (projects?.videoProjects) {
      projects.videoProjects.forEach(project => {
        console.log(`Project ${project.name} thumbTime:`, project.thumbTime);
        console.log(`Project ${project.name} video.asset.thumbTime:`, project.video?.asset?.thumbTime);
      });
    }
  }, [projects?.videoProjects]);

  // Helper function to convert MM:SS.mm time format to seconds
  const timeToSeconds = (timeStr) => {
    if (!timeStr) return 0;
    const [minutes, seconds] = timeStr.split(':').map(Number);
    return minutes * 60 + seconds;
  };
  
  // Function to forcefully set the correct thumbnail time
  const forceSetThumbnail = (muxId, time) => {
    
    
    if (!playerRef.current) {
    
      return false;
    }
    
    const videoEl = playerRef.current.querySelector('video');
    if (!videoEl) {
      console.error('Video element not found in player');
      return false;
    }
    
    
    
    try {
      // First attempt: Try to set the video's current time
      videoEl.currentTime = time;
      console.log('Set video currentTime to:', time);
      
      // Inspect DOM structure for debugging
      console.log('Player HTML structure:', playerRef.current.innerHTML);
      
      // Look for poster elements using various selectors
      const possibleSelectors = [
        'img.mux-poster',
        'img[data-poster]',
        'img[class*="poster"]',
        'img[src*="' + muxId + '"]',
        'img'
      ];
      
      console.log('Searching for poster elements with selectors:', possibleSelectors);
      
      let posterElement = null;
      for (const selector of possibleSelectors) {
        const elements = playerRef.current.querySelectorAll(selector);
        console.log(`Found ${elements.length} elements with selector ${selector}`);
        
        if (elements.length > 0) {
          elements.forEach((el, index) => {
            console.log(`Element ${index} with selector ${selector}:`, el);
            console.log('Element src:', el.src);
            console.log('Element attributes:', Array.from(el.attributes).map(attr => `${attr.name}="${attr.value}"`).join(', '));
            
            if (el.src && el.src.includes(muxId)) {
              posterElement = el;
              console.log('Found matching poster element:', posterElement);
            }
          });
          
          if (posterElement) break;
        }
      }
      
      if (posterElement) {
        // Store the original src for comparison
        const originalSrc = posterElement.src;
        
        // Update the src to include the time parameter
        if (posterElement.src.includes('?')) {
          // If the URL already has parameters
          if (posterElement.src.includes('time=')) {
            // Replace existing time parameter
            posterElement.src = posterElement.src.replace(/time=\d+(\.\d+)?/, `time=${time}`);
          } else {
            // Add time parameter
            posterElement.src = `${posterElement.src}&time=${time}`;
          }
        } else {
          // If the URL has no parameters yet
          posterElement.src = `${posterElement.src}?time=${time}`;
        }
        
        console.log('Updated poster src from:', originalSrc);
        console.log('Updated poster src to:', posterElement.src);
        
        // Add a load event listener to confirm the update
        posterElement.addEventListener('load', () => {
          console.log('Poster image updated and loaded successfully with time:', time);
        }, { once: true });
        
        // Add an error event listener to catch failures
        posterElement.addEventListener('error', () => {
          console.error('Failed to load updated poster image with time:', time);
          // Try to revert to original state
          posterElement.src = originalSrc;
        }, { once: true });
    } else {
        console.warn('No poster element found via selectors, trying alternative methods');
        
        // Alternative approach: Look for any elements with URLs containing the Mux ID
        const allElements = playerRef.current.querySelectorAll('*');
        console.log(`Checking ${allElements.length} elements for attributes containing Mux ID`);
        
        allElements.forEach((el, index) => {
          Array.from(el.attributes).forEach(attr => {
            if (attr.value && typeof attr.value === 'string' && attr.value.includes(muxId)) {
              console.log(`Found element ${index} with attribute ${attr.name} containing Mux ID:`, attr.value);
              
              // If this attribute has a URL with a time parameter, update it
              if (attr.value.includes('time=')) {
                const originalValue = attr.value;
                const newValue = attr.value.replace(/time=\d+(\.\d+)?/, `time=${time}`);
                el.setAttribute(attr.name, newValue);
                console.log(`Updated attribute ${attr.name} from "${originalValue}" to "${newValue}"`);
              }
            }
          });
        });
      }
      
      // Try to access potential undocumented properties
      if (videoEl._mux) {
        console.log('Found _mux property on video element:', videoEl._mux);
        // Try to update thumbnail through _mux property if methods exist
      }
      
      // Dispatch custom event to notify about thumbnail update attempt
      const event = new CustomEvent('thumbnailUpdateAttempt', { 
        detail: { muxId, time, success: true } 
      });
      playerRef.current.dispatchEvent(event);
      
      return true;
    } catch (error) {
      console.error('Error while forcing thumbnail update:', error);
      
      // Dispatch custom event with error information
      const event = new CustomEvent('thumbnailUpdateAttempt', { 
        detail: { muxId, time, success: false, error: error.message } 
      });
      playerRef.current.dispatchEvent(event);
      
      return false;
    }
  };
  
  // Effect to initialize all video elements with their correct thumbnails
  useEffect(() => {
    if (!projects.videoProjects) return;
    
    // Function to initialize all videos with the correct thumbnails
    const initializeVideos = () => {
      const newInitializedState = {...videosInitialized};
      
      projects.videoProjects.forEach(project => {
        if (project.video?.asset?.playbackId) {
          const videoElement = videoRefs.current[project._id];
          if (videoElement) {
            // Get the custom thumbnail time
            const thumbTime = project.thumbTime || project.video?.asset?.thumbTime || 0;
            console.log(`Initializing ${project.name} with thumbTime ${thumbTime}`);
            
            // Force set the thumbnail time
            forceSetThumbnail(project.video.asset.playbackId, thumbTime);
            
            // Mark this video as initialized
            newInitializedState[project._id] = true;
          }
        }
      });
      
      if (Object.keys(newInitializedState).length > Object.keys(videosInitialized).length) {
        setVideosInitialized(newInitializedState);
      }
    };
    
    // Try multiple times to ensure videos are initialized correctly
    initializeVideos();
    const timers = [
      setTimeout(initializeVideos, 100),
      setTimeout(initializeVideos, 500),
      setTimeout(initializeVideos, 1000),
      setTimeout(initializeVideos, 2000)
    ];
    
    return () => timers.forEach(timer => clearTimeout(timer));
  }, [projects.videoProjects, videosInitialized]);
  
  // Function to forcefully reset a video to its thumbnail state
  const resetToThumbnail = useCallback((projectId, muxId, time) => {
    
    const videoElement = videoRefs.current[projectId];
    
    if (!videoElement) {
      console.error(`Video element for project ${projectId} not found`);
      return;
    }
    
    // First pause the video to stop playback
    videoElement.pause();
    
    // Set the currentTime directly
    videoElement.currentTime = time;
    
    // Force set the thumbnail using our helper function
    forceSetThumbnail(muxId, time);
    
    // Try showing the poster by setting display properties
    const videoContainers = playerRef.current ? 
      Array.from(playerRef.current.querySelectorAll('.mux-player, [data-mux-player-container]')) : [];
    
    videoContainers.forEach(container => {
      const posterContainer = container.querySelector('.mux-poster');
      if (posterContainer) {
        console.log('Found poster container, ensuring it is visible');
        posterContainer.style.display = 'block';
        posterContainer.style.opacity = '1';
        posterContainer.style.visibility = 'visible';
      }
    });
    
    // Dispatch an event to notify that we've reset to the thumbnail
    const event = new CustomEvent('resetToThumbnail', { 
      detail: { projectId, muxId, time, timestamp: Date.now() }
    });
    videoElement.dispatchEvent(event);
  }, [forceSetThumbnail]);
  
  // Effect to control video playback based on hover state
  useEffect(() => {
    // When a project is not hovered, ensure all videos show the correct thumbnail
    Object.keys(videoRefs.current).forEach(id => {
      const project = projects.videoProjects.find(p => p._id === id);
      
      if (project && project.video?.asset?.playbackId) {
        const thumbTime = project.thumbTime || project.video?.asset?.thumbTime || 0;
        
        // If this project is not the currently hovered one, reset to thumbnail
        if (!hoveredProject || hoveredProject._id !== id) {
          resetToThumbnail(id, project.video.asset.playbackId, thumbTime);
        }
      }
    });
    
    // When a project is hovered, play its video within the specified time range
    if (hoveredProject && hoveredProject.video?.asset?.playbackId) {
      const startTime = hoveredProject.video?.hoverPreview?.startTime 
        ? timeToSeconds(hoveredProject.video.hoverPreview.startTime) 
        : 0;
      
      const endTime = hoveredProject.video?.hoverPreview?.endTime
        ? timeToSeconds(hoveredProject.video.hoverPreview.endTime)
        : undefined;
      
      const videoElement = videoRefs.current[hoveredProject._id];
      if (videoElement) {
        // First ensure the video is loaded and then set to hover time range
        videoElement.currentTime = startTime;
        
        // Set up event listener to loop within time range if endTime is defined
        const handleTimeUpdate = () => {
          if (endTime && videoElement.currentTime >= endTime) {
            videoElement.currentTime = startTime;
          }
        };
        
        videoElement.addEventListener('timeupdate', handleTimeUpdate);
        videoElement.play().catch(err => console.error('Error playing video:', err));
        
        // Clean up event listener when component unmounts or hover changes
        return () => {
          videoElement.removeEventListener('timeupdate', handleTimeUpdate);
        };
      }
    }
  }, [hoveredProject, projects.videoProjects, resetToThumbnail]);

  useEffect(() => {
    if (playerRef.current) {
      const videoEl = playerRef.current.querySelector('video');
      
      if (videoEl) {
        console.log('Setting up video event listeners');
        
        // Log when metadata is loaded
        videoEl.addEventListener('loadedmetadata', () => {
          console.log('Video metadata loaded, duration:', videoEl.duration);
        });
        
        // Log when video starts loading
        videoEl.addEventListener('loadstart', () => {
          console.log('Video load started');
        });
        
        // Log when video is loaded enough to play
        videoEl.addEventListener('canplay', () => {
          console.log('Video can play now');
        });
        
        // Log when video is fully loaded
        videoEl.addEventListener('canplaythrough', () => {
          console.log('Video fully loaded');
        });
        
        // Monitor for poster changes
        const monitorPosterChanges = () => {
          // First, find all potential poster elements
          const posterElements = [];
          
          // Add event listeners to any img elements that might be posters
          playerRef.current.querySelectorAll('img').forEach(img => {
            posterElements.push(img);
            
            // Add load event listener
            img.addEventListener('load', (e) => {
              console.log('Poster image loaded:', e.target.src);
            });
            
            // Add error event listener
            img.addEventListener('error', (e) => {
              console.error('Poster image failed to load:', e.target.src);
            });
          });
          
          // Set up a MutationObserver to watch for changes to poster attributes
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === 'attributes' && 
                  (mutation.attributeName === 'src' || mutation.attributeName === 'poster')) {
                console.log('Poster attribute changed:', 
                            mutation.attributeName, 
                            mutation.target.getAttribute(mutation.attributeName));
              } else if (mutation.type === 'childList') {
                // If new nodes were added, check if they're img elements
                mutation.addedNodes.forEach(node => {
                  if (node.tagName === 'IMG') {
                    console.log('New poster image added:', node);
                    
                    // Add event listeners to new img elements
                    node.addEventListener('load', (e) => {
                      console.log('New poster image loaded:', e.target.src);
                    });
                    
                    node.addEventListener('error', (e) => {
                      console.error('New poster image failed to load:', e.target.src);
                    });
                  }
                });
              }
            });
          });
          
          // Watch for changes to the player element and its descendants
          observer.observe(playerRef.current, { 
            attributes: true, 
            childList: true, 
            subtree: true,
            attributeFilter: ['src', 'poster', 'style']
          });
          
          console.log('Poster change monitoring set up for elements:', posterElements);
          return observer;
        };
        
        // Start monitoring poster changes
        const posterObserver = monitorPosterChanges();
        
        // Clean up the observer when the component unmounts
        return () => {
          console.log('Cleaning up video event listeners');
          videoEl.removeEventListener('loadedmetadata', null);
          videoEl.removeEventListener('loadstart', null);
          videoEl.removeEventListener('canplay', null);
          videoEl.removeEventListener('canplaythrough', null);
          if (posterObserver) {
            posterObserver.disconnect();
          }
        };
      }
    }
  }, []);

  if (!projects.videoProjects) return null;
  
  return (
    <div className="bottom-gallery absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 z-[9]">
      <div className="w-full overflow-x-auto overflow-y-hidden">
        <div className="flex gap-2">
          {projects.videoProjects.map((project) => {
            // Get the custom thumbnail time
            const thumbTime = project.thumbTime || project.video?.asset?.thumbTime || 0;

            return (
            <Link 
              href={`/video-project/${project.slug}`}
              key={project._id}
              className="w-[200px] h-[200px] flex-shrink-0 relative overflow-hidden"
              onMouseEnter={() => handleProjectHover(project)}
              onMouseLeave={() => {
                // Reset to thumbnail on mouse leave
                resetToThumbnail(project._id, project.video.asset.playbackId, thumbTime);
                handleProjectLeave();
              }}
            >
              <div className="relative w-full h-full overflow-hidden">
                {/* MUX video thumbnail that plays on hover */}
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
                          // If the video element is newly mounted, set its time to the thumbnail
                          if (el) {
                            console.log(`Setting initial thumbnail for ${project.name} to ${thumbTime}`, el);
                            // Try to set thumbnail immediately and after a small delay
                            forceSetThumbnail(project.video.asset.playbackId, thumbTime);
                            setTimeout(() => forceSetThumbnail(project.video.asset.playbackId, thumbTime), 100);
                          }
                        }}
                        onLoadedMetadata={() => {
                          console.log(`Metadata loaded for ${project.name}, applying thumbTime ${thumbTime}`);
                          const videoElement = videoRefs.current[project._id];
                          if (videoElement) forceSetThumbnail(project.video.asset.playbackId, thumbTime);
                        }}
                        onLoadStart={() => {
                          console.log(`Load started for ${project.name}`);
                        }}
                        onLoad={() => {
                          console.log(`Video loaded for ${project.name}, applying thumbTime ${thumbTime}`);
                          const videoElement = videoRefs.current[project._id];
                          if (videoElement) forceSetThumbnail(project.video.asset.playbackId, thumbTime);
                        }}
                        onPosterLoaded={() => {
                          console.log(`Poster loaded for ${project.name}`);
                        }}
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