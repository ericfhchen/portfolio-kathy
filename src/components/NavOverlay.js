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
  const [allClients, setAllClients] = useState([]);
  const [visibleClients, setVisibleClients] = useState([]);
  const [siteInfo, setSiteInfo] = useState({
    bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur id mi fringilla, euismod tellus sit amet, dictum elit.',
    contactText: 'Booking and commissions are currently open.',
    email: 'contact@kathymnguyen.com',
    instagramLink: 'https://www.instagram.com/recognizekat',
    instagramText: 'Instagram',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch all clients
        const allClientsQuery = groq`*[_type == "clients"] | order(orderRank) { 
          _id, 
          title, 
          link, 
          showInSelectedClients 
        }`;
        const allClientsData = await client.fetch(allClientsQuery);
        setAllClients(allClientsData);
        
        // Filter clients to only show those with showInSelectedClients === true
        const filtered = allClientsData.filter(c => c.showInSelectedClients === true);
        setVisibleClients(filtered);
        
        // Fetch site information
        const siteInfoQuery = groq`*[_type == "siteInfo"][0]{
          bio,
          contactText,
          email,
          instagramLink,
          instagramText
        }`;
        
        const siteInfoData = await client.fetch(siteInfoQuery);
        if (siteInfoData) {
          setSiteInfo(prev => ({
            ...prev,
            ...siteInfoData
          }));
        }
      } catch (error) {
        // Error fetching data
        // Keep using default values if there's an error
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

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

  if (!isOverlayVisible) return null;

  const handleClose = () => {
    setOverlayVisible(false);
    // Notify the Nav component that the overlay is closed
    navEvents.hideOverlay();
  };

  return (
    <div className="fixed inset-0 bg-[rgba(239,239,239,0.8)] backdrop-blur-[40px] z-[9999] flex items-start md:items-center overflow-y-auto">
      <div className="w-full px-2.5">
        {/* Mobile nav positions - matches exact positions from nav.js */}
        <div className="md:hidden">
          {/* Left side - Kathy Nguyen */}
          <div className="fixed top-0 left-0 p-2.5 pt-0">
            <div className="text-left pr-2 pt-2 pb-2">
              <Link href="/">Kathy Nguyen</Link>
            </div>
          </div>
          
          {/* Right side - CLOSE */}
          <div className="fixed top-0 right-0 p-2.5 pt-0">
            <div className="text-right pl-2 pt-2 pb-2 cursor-pointer" onClick={handleClose}>
              (CLOSE)
            </div>
          </div>
        </div>

        {/* Always show the content, even if it's loading */}
        {/* Mobile Content - Vertical Layout */}
        <div className="md:hidden pt-8 pb-4 flex flex-col gap-6">
          {/* Bio Section */}
          <div className="w-full">
            <div>
              {siteInfo.bio}
            </div>
          </div>

          {/* Clients Section */}
          <div className="w-full">
            <div className="font-bold mb-2">Selected Clients</div>
            <div className="flex flex-col gap-0">
              {isLoading ? (
                <div>Loading clients...</div>
              ) : visibleClients.length === 0 ? (
                <div>No clients to display</div>
              ) : (
                visibleClients.map(client => (
                  <div key={client._id}>
                    {client.link ? (
                      <Link href={client.link} target="_blank" rel="noopener noreferrer">
                        {client.title}
                      </Link>
                    ) : (
                      <span>{client.title}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Contact Section */}
          <div className="w-full">
            <div className="font-bold mb-2">Contact</div>
            <div>
              {siteInfo.contactText}
            </div>
            <div>
              <Link href={`mailto:${siteInfo.email}`}>{siteInfo.email}</Link>
            </div>
            <div className='mt-2'>
              <Link href={siteInfo.instagramLink} target="_blank" rel="noopener noreferrer">
                {siteInfo.instagramText}
              </Link>
            </div>
          </div>

          {/* Footer for Mobile */}
          <div className="w-full fixed bottom-0 left-0 right-0 px-2.5 pb-2.5">
            <div className="flex justify-between w-full">
              <div>©{new Date().getFullYear()} Kathy Nguyen</div>
              <div>Website by <Link href="https://www.left.systems" target="_blank" rel="noopener noreferrer">LEFT</Link></div>
            </div>
          </div>
        </div>

        {/* Desktop layout - only visible on md and up */}
        <div className='hidden md:flex justify-between items-start w-full'>
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

        {/* ROW 2 - Desktop only */}
        <div className='hidden md:flex absolute top-[calc(100vh/2 + 2rem)] left-0 right-0 px-2.5 mt-4'>
          <div className="flex items-start gap-6 w-full">
            {/* Bio */}
            <div className="flex flex-col w-1/3 mr-20">
              {siteInfo.bio}
            </div>

            {/* Clients */}
            <div className="flex flex-col w-1/6">
              {isLoading ? (
                <div>Loading clients...</div>
              ) : visibleClients.length === 0 ? (
                <div>No clients to display</div>
              ) : (
                visibleClients.map(client => (
                  <div key={client._id}>
                    {client.link ? (
                      <Link href={client.link} target="_blank" rel="noopener noreferrer">
                        {client.title}
                      </Link>
                    ) : (
                      <span>{client.title}</span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Contact */}
            <div className="flex flex-col w-1/6">
              <div>
                {siteInfo.contactText}
              </div>
              <div>
                <Link href={`mailto:${siteInfo.email}`}>{siteInfo.email}</Link>
              </div>
              <div className="mt-2">
                <Link href={siteInfo.instagramLink} target="_blank" rel="noopener noreferrer">
                  {siteInfo.instagramText}
                </Link>
              </div>
            </div>
          </div>
          <div className="text-right mt-4" style={{ visibility: 'hidden' }}>(CLOSE)</div>
        </div>

        {/* Footer section - Desktop only */}
        <div className="hidden md:block w-full absolute bottom-0 left-0 p-2.5">
          <div className="flex items-start gap-6 w-1/3">
            <div className="flex flex-col w-1/2">
              ©{new Date().getFullYear()} Kathy Nguyen
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