'use client'

import { useState } from 'react'
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
  
  if (!images || images.length === 0) return null;
  
  return (
    <div className="image-gallery">
      {/* Images gallery - one image at a time with click navigation */}
      <div className="fixed inset-0 flex items-center justify-center select-none">
        <div 
          className="w-[100vw] h-[85vh] md:w-[75vw] md:h-[75vh] flex items-center justify-center cursor-pointer select-none"
          onClick={goToNextImage}
        >
          <Image
            src={images[currentImageIndex]}
            alt={`${name} - Image ${currentImageIndex + 1}`}
            width={1200}
            height={800}
            className="max-w-full max-h-full object-contain select-none"
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
        <div className="fixed bottom-0 left-0 right-0 mb-2.5 flex justify-center gap-8">
          <button 
            onClick={goToPrevImage} 
            className="uppercase hover:opacity-60 transition-opacity leading-[1]"
          >
            Prev
          </button>
          <button 
            onClick={goToNextImage} 
            className="uppercase hover:opacity-60 transition-opacity leading-[1]"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
} 