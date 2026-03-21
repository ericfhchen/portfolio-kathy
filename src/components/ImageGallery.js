'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'

// Derive a tiny blur URL from a Sanity image URL
function getBlurUrl(src) {
  return src.replace(/\?.*$/, '?w=40&blur=200&auto=format&q=20');
}

export default function ImageGallery({ images, name }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeImageSlot, setActiveImageSlot] = useState(0);
  const [imageSlots, setImageSlots] = useState([0, 0]);
  const [blurVisible, setBlurVisible] = useState(true);
  const navTimeRef = useRef(null);
  const preloadedRef = useRef(new Set());
  const inFlightRef = useRef(new Set());

  // Initialize image slots
  useEffect(() => {
    if (images && images.length > 0) {
      setImageSlots([0, 0]);
    }
  }, [images]);

  // Show blur again when navigating to un-cached images
  useEffect(() => {
    if (!preloadedRef.current.has(images?.[currentImageIndex])) {
      setBlurVisible(true);
    }
  }, [currentImageIndex, images]);

  const goToNextImage = useCallback(() => {
    if (images && images.length > 0) {
      const nextIndex = currentImageIndex === images.length - 1 ? 0 : currentImageIndex + 1;
      navTimeRef.current = performance.now();
      const cached = preloadedRef.current.has(images[nextIndex]);
      console.log(`[IMG] Navigate -> index ${nextIndex} | cached: ${cached}`);
      setCurrentImageIndex(nextIndex);

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
      navTimeRef.current = performance.now();
      const cached = preloadedRef.current.has(images[prevIndex]);
      console.log(`[IMG] Navigate <- index ${prevIndex} | cached: ${cached}`);
      setCurrentImageIndex(prevIndex);

      const newActiveSlot = activeImageSlot === 0 ? 1 : 0;
      setImageSlots(prev => {
        const newSlots = [...prev];
        newSlots[newActiveSlot] = prevIndex;
        return newSlots;
      });
    }
  }, [images, currentImageIndex, activeImageSlot]);

  // Keyboard navigation
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

  // Preload helper — deduplicates across mounts and navigations
  const preloadImage = useCallback((src, idx) => {
    if (preloadedRef.current.has(src) || inFlightRef.current.has(src)) return;
    inFlightRef.current.add(src);
    const start = performance.now();
    const img = new window.Image();
    img.onload = () => {
      preloadedRef.current.add(src);
      inFlightRef.current.delete(src);
      console.log(`[IMG] Preloaded index ${idx} in ${Math.round(performance.now() - start)}ms`);
    };
    img.onerror = () => {
      inFlightRef.current.delete(src);
      console.log(`[IMG] Preload FAILED index ${idx}`);
    };
    img.src = src;
  }, []);

  // Preload adjacent images — next 5 and prev 1
  useEffect(() => {
    if (!images || images.length <= 1) return;

    for (let i = 1; i <= Math.min(5, images.length - 1); i++) {
      const idx = (currentImageIndex + i) % images.length;
      preloadImage(images[idx], idx);
    }
    const prevIdx = currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1;
    preloadImage(images[prevIdx], prevIdx);
  }, [currentImageIndex, images, preloadImage]);

  const firstLoadRef = useRef(true);
  const handleImageLoad = (slotIndex) => {
    const elapsed = navTimeRef.current ? Math.round(performance.now() - navTimeRef.current) : 0;
    const sincePageRender = typeof window !== 'undefined' && window.__pageRenderTime
      ? Date.now() - window.__pageRenderTime
      : null;
    if (firstLoadRef.current) {
      const sinceMount = mountTimeRef.current ? Date.now() - mountTimeRef.current : '?';
      console.log(`[IMG] ★ FIRST IMAGE VISIBLE — ${sinceMount}ms since mount, ${sincePageRender}ms since page render`);
      firstLoadRef.current = false;
    }
    console.log(`[IMG] Slot ${slotIndex} loaded in ${elapsed}ms | active: ${activeImageSlot} | switching: ${slotIndex !== activeImageSlot}`);
    if (slotIndex !== activeImageSlot) {
      setActiveImageSlot(slotIndex);
    }
    setBlurVisible(false);
  };

  // Track mount time for accurate first-image timing
  const mountTimeRef = useRef(null);
  useEffect(() => {
    if (images && images.length > 0) {
      mountTimeRef.current = Date.now();
      const sinceRender = typeof window !== 'undefined' && window.__pageRenderTime
        ? Date.now() - window.__pageRenderTime
        : '?';
      console.log(`[IMG] Gallery mounted with ${images.length} images | ${sinceRender}ms since page render`);
      console.log(`[IMG] First image URL: ${images[0].substring(0, 80)}...`);
      firstLoadRef.current = true;
    }
  }, [images]);

  if (!images || images.length === 0) return null;

  // Current blur URL for the displayed image
  const currentBlurUrl = getBlurUrl(images[currentImageIndex]);

  return (
    <div className="image-gallery w-full h-full">
      <div className="fixed inset-0 flex items-center justify-center select-none">
        <div
          className="w-[100vw] h-[70vh] md:w-[75vw] md:h-[75vh] flex items-center justify-center cursor-pointer select-none relative"
        >
          <div
            className="absolute left-0 top-0 w-1/2 h-full cursor-pointer"
            style={{ zIndex: 10 }}
            onClick={(e) => {
              e.stopPropagation();
              goToPrevImage();
            }}
            aria-label="Previous image"
          />

          <div
            className="absolute right-0 top-0 w-1/2 h-full cursor-pointer"
            style={{ zIndex: 10 }}
            onClick={(e) => {
              e.stopPropagation();
              goToNextImage();
            }}
            aria-label="Next image"
          />

          {/* Blur placeholder — matches image aspect ratio with hard edges */}
          <Image
            src={currentBlurUrl}
            alt=""
            aria-hidden="true"
            width={1200}
            height={800}
            unoptimized
            className={`max-w-full max-h-full object-contain select-none absolute transition-opacity duration-100 ${
              blurVisible ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              maxHeight: 'calc(100% - 10px)',
              objectFit: 'contain',
              zIndex: 5,
              pointerEvents: 'none',
            }}
          />

          {/* Image Slot 0 */}
          <Image
            src={images[imageSlots[0]]}
            alt={`${name} - Image ${imageSlots[0] + 1}`}
            width={1200}
            height={800}
            unoptimized
            sizes="(max-width: 768px) 100vw, 75vw"
            className={`max-w-full max-h-full object-contain select-none absolute transition-opacity duration-0 ${
              activeImageSlot === 0 ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              maxHeight: 'calc(100% - 10px)',
              objectFit: 'contain',
              zIndex: activeImageSlot === 0 ? 4 : 3,
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
            unoptimized
            sizes="(max-width: 768px) 100vw, 75vw"
            className={`max-w-full max-h-full object-contain select-none absolute transition-opacity duration-0 ${
              activeImageSlot === 1 ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              maxHeight: 'calc(100% - 10px)',
              objectFit: 'contain',
              zIndex: activeImageSlot === 1 ? 4 : 3,
            }}
            priority={imageSlots[1] === 0}
            unselectable="on"
            draggable="false"
            onLoad={() => handleImageLoad(1)}
          />
        </div>
      </div>

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
