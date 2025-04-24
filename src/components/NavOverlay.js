'use client'

import { useEffect, useState } from 'react';
import { client } from '../sanity/lib/client';
import { groq } from 'next-sanity';
import Link from 'next/link';

// Create a simple event system for cross-component communication
let overlayListeners = [];
export const navEvents = {
  subscribe: (callback) => {
    overlayListeners.push(callback);
    return () => {
      overlayListeners = overlayListeners.filter(listener => listener !== callback);
    };
  },
  toggleOverlay: () => {
    overlayListeners.forEach(listener => listener());
  },
  hideOverlay: () => {
    overlayListeners.forEach(listener => listener(false));
  }
};

export default function NavOverlay() {
  const [isOverlayVisible, setOverlayVisible] = useState(false);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    const unsubscribe = navEvents.subscribe((forceState) => {
      // If forceState is provided, use it, otherwise toggle
      if (typeof forceState === 'boolean') {
        setOverlayVisible(forceState);
      } else {
        setOverlayVisible(prev => !prev);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchClients = async () => {
      const query = groq`*[_type == "clients"] { _id, title, link }`;
      const data = await client.fetch(query);
      setClients(data);
    };

    if (isOverlayVisible) {
      fetchClients();
    }
  }, [isOverlayVisible]);

  if (!isOverlayVisible) return null;

  const handleClose = () => {
    setOverlayVisible(false);
    // Notify the Nav component that the overlay is closed
    navEvents.hideOverlay();
  };

  return (
    <div className="fixed inset-0 bg-[rgba(239,239,239,0.8)] backdrop-blur-[40px] z-[9999] flex items-center">
      <div className="w-full px-2.5">
        {/* ROW 1 */}
        <div className='flex justify-between items-start w-full'>
          <div className="flex items-start gap-6 w-full">
            {/* Bio section */}
            <div className="flex flex-col w-1/3 mr-20">
              <div className="text-left pt-2">
                <Link href="/">Kathy Nguyen</Link>
              </div>
            </div>

            {/* Selected Clients section */}
            <div className="flex flex-col w-1/6">
              <div className="pt-2">Selected Clients</div>
            </div>

            {/* Contact section */}
            <div className="flex flex-col w-1/6">
              <div className="pt-2">Contact</div>
            </div>
          </div>

          {/* Close button */}
          <div className="text-right pt-2 pb-2 cursor-pointer" onClick={handleClose}>
            (CLOSE)
          </div>
        </div>

        {/* ROW 2 */}
        <div className='flex absolute top-[calc(100vh/2 + 2rem)] left-0 right-0 px-2.5 mt-4'>
          <div className="flex items-start gap-6 w-full">
            {/* Bio */}
            <div className="flex flex-col w-1/3 mr-20">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur id mi fringilla, euismod tellus sit amet, dictum elit. Quisque nec eleifend neque, non ultrices nibh. In sed auctor orci. Morbi nulla nisl, aliquam varius lectus et, mollis aliquet justo. Nam fringilla accumsan tellus, et vulputate nunc. 
            </div>

            {/* Clients */}
            <div className="flex flex-col w-1/6">
              {clients.map(client => (
                <div key={client._id}>
                  {client.link ? (
                    <Link href={client.link} target="_blank" rel="noopener noreferrer">
                      {client.title}
                    </Link>
                  ) : (
                    <span>{client.title}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Contact */}
            <div className="flex flex-col w-1/6">
              <div>
                Booking and commissions are currently open. contact@kathymnguyen.com
              </div>
              <div className="mt-2">
                <Link href="https://www.instagram.com/recognizekat" target="_blank" rel="noopener noreferrer">Instagram</Link>
              </div>
            </div>
          </div>
          <div className="text-right mt-4" style={{ visibility: 'hidden' }}>(CLOSE)</div>
        </div>

        {/* Footer section */}
        <div className="w-full absolute bottom-0 left-0 p-2.5">
          <div className="flex items-start gap-6 w-1/3">
            <div className="flex flex-col w-1/2">
              ©{new Date().getFullYear()} KATHY NGUYEN
            </div>
            <div className="flex flex-col w-1/2">
              <span>Website by <Link href="https://www.left.systems" target="_blank" rel="noopener noreferrer">LEFT</Link></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 