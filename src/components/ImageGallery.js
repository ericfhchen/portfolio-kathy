'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

export default function ImageGallery({ images, name }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeImageSlot, setActiveImageSlot] = useState(0); // 0 or 1 for alternating images
  const [imageSlots, setImageSlots] = useState([0, 0]); // Track which image is in each slot
  
  // Initialize image slots
  useEffect(() => {
    if (images && images.length > 0) {
      setImageSlots([0, 0]);
    }
  }, [images]);
  
  const goToNextImage = useCallback(() => {
    if (images && images.length > 0) {
      const nextIndex = currentImageIndex === images.length - 1 ? 0 : currentImageIndex + 1;
      setCurrentImageIndex(nextIndex);
      
      // Switch to the other image slot and load the new image there
      const newActiveSlot = activeImageSlot === 0 ? 1 : 0;
      setImageSlots(prev => {
        const newSlots = [...prev];
        newSlots[newActiveSlot] = nextIndex;
        return newSlots;
      });
    }
  }, [images, currentImageIndex, activeImageSlot]);
  
  const goToPrevImage = useCallback(() => {
    if (images && images.length > 0) {
      const prevIndex = currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1;
      setCurrentImageIndex(prevIndex);
      
      // Switch to the other image slot and load the new image there
      const newActiveSlot = activeImageSlot === 0 ? 1 : 0;
      setImageSlots(prev => {
        const newSlots = [...prev];
        newSlots[newActiveSlot] = prevIndex;
        return newSlots;
      });
    }
  }, [images, currentImageIndex, activeImageSlot]);
  
  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        goToNextImage();
      } else if (e.key === 'ArrowLeft') {
        goToPrevImage();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [goToNextImage, goToPrevImage]);

  // Preload adjacent images using native browser preloading
  useEffect(() => {
    if (images && images.length > 1) {
      const nextIndex = (currentImageIndex + 1) % images.length;
      const prevIndex = currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1;
      
      const nextImg = new window.Image();
      nextImg.src = images[nextIndex];
      
      const prevImg = new window.Image();
      prevImg.src = images[prevIndex];
    }
  }, [currentImageIndex, images]);

  const handleImageLoad = (slotIndex) => {
    // When the non-active slot finishes loading, switch to it
    if (slotIndex !== activeImageSlot) {
      setActiveImageSlot(slotIndex);
    }
  };

  if (!images || images.length === 0) return null;
  
  return (
    <div className="image-gallery w-full h-full">
      {/* Images gallery - one image at a time with click navigation */}
      <div className="fixed inset-0 flex items-center justify-center select-none">
        <div 
          className="w-[100vw] h-[70vh] md:w-[75vw] md:h-[75vh] flex items-center justify-center cursor-pointer select-none relative"
        >
          {/* Left side click area for previous image */}
          <div 
            className="absolute left-0 top-0 w-1/2 h-full z-10 cursor-pointer" 
            onClick={(e) => {
              e.stopPropagation();
              goToPrevImage();
            }}
            aria-label="Previous image"
          />
          
          {/* Right side click area for next image */}
          <div 
            className="absolute right-0 top-0 w-1/2 h-full z-10 cursor-pointer" 
            onClick={(e) => {
              e.stopPropagation();
              goToNextImage();
            }}
            aria-label="Next image"
          />
          
          {/* Image Slot 0 */}
          <Image
            src={images[imageSlots[0]]}
            alt={`${name} - Image ${imageSlots[0] + 1}`}
            width={1200}
            height={800}
            className={`max-w-full max-h-full object-contain select-none absolute transition-opacity duration-0 ${
              activeImageSlot === 0 ? 'opacity-100 z-1' : 'opacity-0 z-0'
            }`}
            style={{
              maxHeight: 'calc(100% - 10px)',
              objectFit: 'contain'
            }}
            priority={imageSlots[0] === 0}
            unselectable="on"
            draggable="false"
            onLoad={() => handleImageLoad(0)}
          />
          
          {/* Image Slot 1 */}
          <Image
            src={images[imageSlots[1]]}
            alt={`${name} - Image ${imageSlots[1] + 1}`}
            width={1200}
            height={800}
            className={`max-w-full max-h-full object-contain select-none absolute transition-opacity duration-0 ${
              activeImageSlot === 1 ? 'opacity-100 z-1' : 'opacity-0 z-0'
            }`}
            style={{
              maxHeight: 'calc(100% - 10px)',
              objectFit: 'contain'
            }}
            priority={imageSlots[1] === 0}
            unselectable="on"
            draggable="false"
            onLoad={() => handleImageLoad(1)}
          />
        </div>
      </div>
      
      {/* Navigation buttons - only show if more than 1 image */}
      {images.length > 1 && (
        <div className="fixed bottom-0 left-0 right-0 mb-2.5 flex justify-center gap-8 z-10">
          <button 
            onClick={goToPrevImage} 
            className="uppercase hover:opacity-60 transition-opacity leading-[1] px-1"
          >
            Prev
          </button>
          <button 
            onClick={goToNextImage} 
            className="uppercase hover:opacity-60 transition-opacity leading-[1] px-1"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
} 