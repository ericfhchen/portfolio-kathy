'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

export default function ImageGallery({ images, name }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const goToNextImage = () => {
    if (images && images.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === images.length - 1 ? 0 : prev + 1
      );
    }
  };
  
  const goToPrevImage = () => {
    if (images && images.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? images.length - 1 : prev - 1
      );
    }
  };
  
  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        goToNextImage();
      } else if (e.key === 'ArrowLeft') {
        goToPrevImage();
      }
    };
    
    // Add event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Clean up event listener
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [goToNextImage, goToPrevImage]);
  
  if (!images || images.length === 0) return null;
  
  return (
    <div className="image-gallery">
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
          
          <Image
            src={images[currentImageIndex]}
            alt={`${name} - Image ${currentImageIndex + 1}`}
            width={1200}
            height={800}
            className="max-w-full max-h-full object-contain select-none z-0"
            style={{
              maxHeight: 'calc(100% - 10px)',
              objectFit: 'contain'
            }}
            priority={true}
            unselectable="on"
            draggable="false"
          />
          
          {/* Preload adjacent images */}
          {images.length > 1 && (
            <div className="hidden">
              <Image
                src={images[(currentImageIndex + 1) % images.length]}
                alt="Preload next"
                width={1200}
                height={800}
                priority={true}
              />
              <Image
                src={images[currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1]}
                alt="Preload previous"
                width={1200}
                height={800}
                priority={true}
              />
            </div>
          )}
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