import Image from 'next/image'
import { client } from '../../../sanity/lib/client'
import { groq } from 'next-sanity'
import Link from 'next/link'
import ImageGallery from '../../../components/ImageGallery'

export async function generateMetadata({ params }) {
  const { slug } = params
  
  const project = await client.fetch(
    groq`*[_type == "imageProjects" && slug.current == $slug][0]{
      name
    }`,
    { slug }
  )
  
  return {
    title: project?.name || 'Project'
  }
}

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

    // Fetch the next project for navigation
    const nextProject = await client.fetch(
      groq`*[_type == "imageProjects" && _id > $projectId] | order(_id asc) [0] {
        _id,
        name,
        "slug": slug.current,
        client->{
          title
        }
      }`,
      { projectId: project._id }
    )

    // If no next project, try to get the first project (loop back)
    const firstProject = !nextProject ? await client.fetch(
      groq`*[_type == "imageProjects"] | order(_id asc) [0] {
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

    if (!project) {
      return (
        <div className="p-2">
          <h1>Project not found</h1>
        </div>
      )
    }

    return (
      <div className="relative h-screen">
        {/* Header with client and tagline */}
        <div className="fixed top-2.5 left-0 right-0 z-10">
          {project.client && (
            <div className="text-center">
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
            <div className="text-center">{project.projectTagline}</div>
          )}
        </div>

        {/* Client component for interactive gallery */}
        <ImageGallery images={project.images} name={project.name} />

        {/* Credits section - anchored to bottom left */}
        {project.credits && (
          <div className="fixed bottom-0 left-0 p-2.5 max-w-xs z-10">
            <div className="">
              <div className="uppercase mb-1">Credits</div>
              <div className="prose">
                {/* This would need a proper Portable Text renderer */}
                <div dangerouslySetInnerHTML={{ 
                  __html: Array.isArray(project.credits) 
                    ? project.credits.map(block => block.children?.map(child => child.text).join(' ')).join('<br />') 
                    : '' 
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Next project navigation - anchored to bottom right */}
        {navigationProject && (
          <div className="fixed bottom-0 right-0 p-2.5 z-10">
            <Link
              href={`/image-project/${navigationProject.slug}`}
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