import Image from 'next/image'
import { client } from '../../../sanity/lib/client'
import { groq } from 'next-sanity'
import Link from 'next/link'

export default async function VideoProjectPage({ params }) {
  const { slug } = params

  try {
    // Fetch the specific video project
    const project = await client.fetch(
      groq`*[_type == "videoProjects" && slug.current == $slug][0]{
        _id,
        name,
        "slug": slug.current,
        "coverImage": coverImage.asset->url,
        video,
        coverVideo,
        credits,
        "images": images[].asset->url,
        orderRank,
        client->{
          title,
          link
        }
      }`,
      { slug }
    )

    if (!project) {
      return (
        <div className="p-2">
          <h1>Project not found</h1>
        </div>
      )
    }

    // Fetch the next project for navigation
    const nextProject = await client.fetch(
      groq`*[_type == "videoProjects" && orderRank > $currentOrderRank] | order(orderRank) [0] {
        _id,
        name,
        "slug": slug.current,
        client->{
          title
        }
      }`,
      { currentOrderRank: project.orderRank }
    )

    // If no next project, try to get the first project (loop back)
    const firstProject = !nextProject ? await client.fetch(
      groq`*[_type == "videoProjects"] | order(orderRank) [0] {
        _id,
        name,
        "slug": slug.current,
        client->{
          title
        }
      }`
    ) : null

    // Use the next project or loop back to the first project
    const navigationProject = nextProject || firstProject

    return (
      <div className="p-2 overflow-y-auto h-[calc(100svh-8rem)]">
        <div className="mb-8">
          <h1 className="text-2xl">{project.name}</h1>
          {project.client && (
            <div className="text-xl">
              {project.client.link ? (
                <a href={project.client.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {project.client.title}
                </a>
              ) : (
                project.client.title
              )}
            </div>
          )}
        </div>

        {/* Main video */}
        {project.video && (
          <div className="mb-8">
            <div className="relative w-full aspect-video">
              {/* Check what type of video we have */}
              {typeof project.video === 'string' ? (
                // YouTube or external video URL
                <iframe
                  src={project.video.replace('watch?v=', 'embed/')}
                  className="absolute top-0 left-0 w-full h-full"
                  title={project.name}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : project.video.asset?.playbackId ? (
                // MUX video
                <iframe
                  src={`https://stream.mux.com/${project.video.asset.playbackId}/medium.mp4`}
                  className="absolute top-0 left-0 w-full h-full"
                  title={project.name}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <div className="bg-gray-800 w-full h-full flex items-center justify-center text-white">
                  No video available
                </div>
              )}
            </div>
          </div>
        )}

        {/* Images gallery (if any) */}
        {project.images && project.images.length > 0 && (
          <div className="grid grid-cols-1 gap-8">
            {project.images.map((imageUrl, index) => (
              <div key={index} className="w-full">
                <Image
                  src={imageUrl}
                  alt={`${project.name} - Image ${index + 1}`}
                  width={1200}
                  height={800}
                  className="w-full h-auto"
                />
              </div>
            ))}
          </div>
        )}

        {/* Credits section */}
        {project.credits && (
          <div className="mt-8">
            <h2 className="text-xl mb-2">Credits</h2>
            <div className="prose">
              {/* This would need a proper Portable Text renderer */}
              <div dangerouslySetInnerHTML={{ 
                __html: Array.isArray(project.credits) 
                  ? project.credits.map(block => block.children?.map(child => child.text).join(' ')).join('<br />') 
                  : '' 
              }} />
            </div>
          </div>
        )}
        
        {/* Next project navigation */}
        {navigationProject && (
          <div className="mt-8 flex justify-end">
            <Link
              href={`/video-project/${navigationProject.slug}`}
              className="flex items-center hover:opacity-70 transition-opacity"
            >
              <span className="leading-[1]">{navigationProject.client?.title || navigationProject.name}</span>
              <svg width="9" height="10" viewBox="0 0 9 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-1">
                <path d="M4.52521 9.47763L3.53658 8.49751L6.13175 5.90234H0.0507812V4.462H6.13175L3.53658 1.87109L4.52521 0.886719L8.82067 5.18217L4.52521 9.47763Z" fill="black"/>
              </svg>
            </Link>
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error('Error fetching project:', error)
    return (
      <div className="p-2">
        <h1>Error loading project</h1>
      </div>
    )
  }
} 