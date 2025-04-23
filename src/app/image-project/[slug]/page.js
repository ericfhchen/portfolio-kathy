import Image from 'next/image'
import { client } from '../../../sanity/lib/client'
import { groq } from 'next-sanity'

export default async function ImageProjectPage({ params }) {
  const { slug } = params

  try {
    // Fetch the specific image project
    const project = await client.fetch(
      groq`*[_type == "imageProjects" && slug.current == $slug][0]{
        _id,
        name,
        "slug": slug.current,
        "images": images[].asset->url,
        credits,
        client->{
          title,
          link
        },
        projectTagline
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
          {project.projectTagline && (
            <div className="text-sm mt-1">{project.projectTagline}</div>
          )}
        </div>

        {/* Images gallery */}
        <div className="grid grid-cols-1 gap-8">
          {project.images?.map((imageUrl, index) => (
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