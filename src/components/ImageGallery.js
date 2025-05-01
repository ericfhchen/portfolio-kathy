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
    <>
      {/* Images gallery - one image at a time with click navigation */}
      <div className="fixed inset-0 flex items-center justify-center">
        <div 
          className="w-[100vw] h-[85vh] md:w-[75vw] md:h-[75vh] flex items-center justify-center cursor-pointer"
          
          onClick={goToNextImage}
        >
          <Image
            src={images[currentImageIndex]}
            alt={`${name} - Image ${currentImageIndex + 1}`}
            width={1200}
            height={800}
            className="max-w-full max-h-full object-contain"
            priority={currentImageIndex === 0}
          />
        </div>
      </div>
      
      {/* Navigation buttons */}
      <div className="fixed bottom-0 left-0 right-0 mb-4 flex justify-center gap-8">
        <button 
          onClick={goToPrevImage} 
          className="uppercase hover:opacity-60 transition-opacity"
        >
          Prev
        </button>
        <button 
          onClick={goToNextImage} 
          className="uppercase hover:opacity-60 transition-opacity"
        >
          Next
        </button>
      </div>
    </>
  );
} 