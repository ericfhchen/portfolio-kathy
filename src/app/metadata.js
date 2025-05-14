import { client } from '../sanity/lib/client'
import { groq } from 'next-sanity'

export async function generateMetadata() {
  // Fetch site information from Sanity
  const siteInfo = await client.fetch(
    groq`*[_type == "siteInfo"][0]{
      title,
      bio,
      keywords,
      "faviconICO": faviconSection.faviconICO.asset->url,
      "faviconSVG": faviconSection.faviconSVG.asset->url,
      "favicon32": faviconSection.favicon32.asset->url,
      "favicon180": faviconSection.favicon180.asset->url,
      "favicon192": faviconSection.favicon192.asset->url,
      "favicon512": faviconSection.favicon512.asset->url
    }`
  )
  
  // Default values in case the fetch fails
  const defaults = {
    title: 'Photography Portfolio',
    description: 'A photography portfolio showcasing creative work and projects',
    keywords: 'photography, portfolio, creative'
  }

  // Filter out any icons with null URLs
  const iconsList = [
    siteInfo?.favicon32 && { url: siteInfo.favicon32, sizes: '32x32', type: 'image/png' },
    siteInfo?.faviconSVG && { url: siteInfo.faviconSVG, type: 'image/svg+xml' },
    siteInfo?.favicon192 && { url: siteInfo.favicon192, sizes: '192x192', type: 'image/png' },
    siteInfo?.favicon512 && { url: siteInfo.favicon512, sizes: '512x512', type: 'image/png' }
  ].filter(Boolean);

  const shortcutList = [
    siteInfo?.faviconICO && { url: siteInfo.faviconICO }
  ].filter(Boolean);

  const appleList = [
    siteInfo?.favicon180 && { url: siteInfo.favicon180, sizes: '180x180', type: 'image/png' }
  ].filter(Boolean);

  return {
    title: {
      template: `%s | ${siteInfo?.title || defaults.title}`,
      default: siteInfo?.title || defaults.title,
    },
    description: siteInfo?.bio || defaults.description,
    keywords: siteInfo?.keywords || defaults.keywords,
    // Add other metadata as needed
    openGraph: {
      title: siteInfo?.title || defaults.title,
      description: siteInfo?.bio || defaults.description,
      type: 'website',
    },
    icons: {
      icon: iconsList.length > 0 ? iconsList : undefined,
      shortcut: shortcutList.length > 0 ? shortcutList : undefined,
      apple: appleList.length > 0 ? appleList : undefined,
    },
  }
} 