'use client'

import { useState, useEffect } from 'react';
import { navEvents } from '../components/NavOverlay';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Nav({ contained = false }) {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const pathname = usePathname();
  const isStudioPage = pathname?.startsWith('/studio');

  useEffect(() => {
    const unsubscribe = navEvents.subscribe((forceState) => {
      if (typeof forceState === 'boolean') {
        setIsOverlayOpen(forceState);
      } else {
        setIsOverlayOpen(prev => !prev);
      }
    });

    return () => unsubscribe();
  }, []);

  const toggleOverlay = () => {
    navEvents.toggleOverlay();
  };

  // If used directly without the wrapper container
  if (!contained) {
    return (
      <div className={`fixed inset-0 flex items-center p-2.5 ${isStudioPage ? 'z-[0]' : 'z-[9]'}`}>
        <div className="w-full">
          <nav className="flex justify-between items-center w-full">
            <div className="text-left pr-2 pt-2 pb-2">
              <Link href="/">Kathy Nguyen</Link>
            </div>
            <div className="text-right pl-2 pt-2 pb-2 cursor-pointer" onClick={toggleOverlay}>
              {isOverlayOpen ? '(CLOSE)' : 'Info'}
            </div>
          </nav>
        </div>
      </div>
    );
  }

  // For use inside other components if needed
  return (
    <nav className="flex justify-between items-center w-full">
      <div className="text-left pr-2 pt-2 pb-2">
        <Link href="/">Kathy Nguyen</Link>
      </div>
      <div className="text-right pl-2 pt-2 pb-2 cursor-pointer" onClick={toggleOverlay}>
        {isOverlayOpen ? '(CLOSE)' : 'Info'}
      </div>
    </nav>
  );
}