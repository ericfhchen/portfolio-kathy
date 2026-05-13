import './globals.css'
import ClientLayout from './ClientLayout'
import { generateMetadata } from './metadata'
import { sanityFetch } from '../sanity/lib/queries'
import { SanityLive } from '../sanity/lib/live'
import { groq } from 'next-sanity'
import { urlFor } from '../sanity/lib/image'

export { generateMetadata }

// Phase 3: Server-side data fetching eliminates client-side API waterfall
async function fetchGalleryData() {
  try {
    const [imageProjects, videoProjects, muxAssets] = await Promise.all([
      sanityFetch(groq`
        *[_type == "imageProjects" && featured == true] | order(orderRank) {
          _id,
          name,
          "slug": slug.current,
          coverImage,
          projectTagline,
          featured,
          client->{
            title
          }
        }
      `),
      sanityFetch(groq`
        *[_type == "videoProjects" && featured == true] | order(orderRank) {
          _id,
          name,
          "slug": slug.current,
          thumbnailImage,
          projectTagline,
          client->{
            title
          },
          "videoGallery": videoGallery[] {
            "asset": asset->,
            "playbackId": asset.playbackId,
            "assetRef": asset._ref,
            "caption": caption
          },
          coverVideo
        }
      `),
      sanityFetch(groq`
        *[_type == "mux.videoAsset"] {
          _id,
          playbackId
        }
      `)
    ])

    // Phase 4: Optimize image URLs via Sanity CDN
    const optimizedImageProjects = imageProjects.map(project => ({
      ...project,
      coverImageBlur: project.coverImage
        ? urlFor(project.coverImage).width(20).blur(200).quality(20).url()
        : null,
      coverImage: project.coverImage
        ? urlFor(project.coverImage).width(400).height(400).format('webp').quality(80).url()
        : null,
    }))

    // Process video projects (same enhancement logic previously in GalleryContext)
    const enhancedVideoProjects = videoProjects.map(project => {
      // Optimize thumbnail image URL
      const optimizedThumbnail = project.thumbnailImage
        ? urlFor(project.thumbnailImage).width(400).height(400).format('webp').quality(80).url()
        : null;
      const thumbnailBlur = project.thumbnailImage
        ? urlFor(project.thumbnailImage).width(20).blur(200).quality(20).url()
        : null;

      if (project.coverVideo?.asset?.asset?._ref) {
        const coverVideoRef = project.coverVideo.asset.asset._ref;
        const muxAsset = muxAssets.find(a => a._id === coverVideoRef);

        if (muxAsset?.playbackId) {
          return {
            ...project,
            thumbnailImage: optimizedThumbnail,
            thumbnailImageBlur: thumbnailBlur,
            video: {
              asset: {
                _type: "mux.videoAsset",
                playbackId: muxAsset.playbackId
              },
              hoverPreview: project.coverVideo.hoverPreview || {}
            },
            coverVideo: {
              ...project.coverVideo,
              asset: {
                ...project.coverVideo.asset,
                playbackId: muxAsset.playbackId
              }
            }
          };
        }
      }

      return { ...project, thumbnailImage: optimizedThumbnail, thumbnailImageBlur: thumbnailBlur };
    })

    return { imageProjects: optimizedImageProjects, videoProjects: enhancedVideoProjects }
  } catch {
    return null
  }
}

export default async function RootLayout({ children }) {
  const initialData = await fetchGalleryData()

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://stream.mux.com" />
        <link rel="preconnect" href="https://image.mux.com" />
      </head>
      <body className="p-2.5 h-svh overflow-hidden">
        <ClientLayout initialData={initialData}>
          {children}
        </ClientLayout>
        <SanityLive />
      </body>
    </html>
  )
}
