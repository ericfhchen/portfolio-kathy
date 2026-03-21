import { getProject, sanityFetch } from '../../../sanity/lib/queries'
import { groq } from 'next-sanity'
import { preload } from 'react-dom'
import ImageGallery from '../../../components/ImageGallery'
import VideoGallery from '../../../components/VideoGallery'
import CreditsOverlay from '../../../components/CreditsOverlay'
import Link from 'next/link'

export async function generateStaticParams() {
  const projects = await sanityFetch(
    groq`*[_type == "imageProjects" || _type == "videoProjects"]{ "slug": slug.current }`
  )
  return projects.map((p) => ({ slug: p.slug }))
}

export const revalidate = 60

export async function generateMetadata({ params }) {
  const { slug } = await params

  const [project, siteInfo] = await Promise.all([
    getProject(slug),
    sanityFetch(groq`*[_type == "siteInfo"][0]{ title, keywords }`)
  ])

  if (!project) {
    return { title: 'Project Not Found' }
  }

  const description = project.projectTagline ||
    `${project.name}${project.client?.title ? ` - ${project.client.title}` : ''}`;

  const projectKeywords = [
    project.name,
    project.client?.title,
    project._type === 'imageProjects' ? 'photography' : 'video',
    ...(siteInfo?.keywords?.split(',') || [])
  ].filter(Boolean).join(', ');

  return {
    title: project.name,
    description,
    keywords: projectKeywords,
    openGraph: {
      title: project.name,
      description,
      type: 'article',
    }
  }
}

export default async function ProjectPage({ params }) {
  const { slug } = await params

  try {
    const fetchStart = Date.now();
    const project = await getProject(slug)
    console.log(`[SERVER] Fetched project "${slug}" in ${Date.now() - fetchStart}ms`);

    if (!project) {
      return (
        <div className="p-2">
          <h1>Project not found</h1>
        </div>
      )
    }

    const isImageProject = project._type === "imageProjects"

    // Transform Sanity image URLs for CDN optimization
    if (isImageProject && project.images) {
      project.images = project.images.map(url => `${url}?w=1920&auto=format&q=85`);
    }

    // Use next project or loop back to first
    const navigationProject = project.nextProject || project.firstProject

    // Preload first 3 images — fires immediately during render for both SSR and client nav
    if (isImageProject && project.images) {
      project.images.slice(0, 3).forEach(url => {
        preload(url, { as: 'image' });
      });
    }

    return (
      <div className="relative md:h-screen h-auto">
        {/* Timestamp for measuring initial load */}
        <script dangerouslySetInnerHTML={{ __html: `window.__pageRenderTime = Date.now(); window.__pageSlug = '${slug}'; console.log('[IMG] Page HTML rendered at', new Date().toISOString());` }} />

        {/* Header with client and tagline */}
        <div className="relative md:fixed md:top-2.5 md:left-0 md:right-0 md:z-10">
          {project.client && (
            <div className={`${isImageProject ? 'leading-[1.1] mb-[0.5]' : ''} text-center`}>
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

        {/* Gallery */}
        {isImageProject ? (
          <ImageGallery images={project.images} name={project.name} />
        ) : (
          <VideoGallery
            videos={project.videoGallery}
            name={project.name}
            coverVideo={project.coverVideo}
          />
        )}

        {/* Credits section with overlay for mobile */}
        {project.credits && (
          <CreditsOverlay credits={project.credits} />
        )}

        {/* Next project navigation - anchored to bottom right */}
        {navigationProject && (
          <div className="fixed bottom-0 right-0 p-2.5 z-10">
            <Link
              href={`/project/${navigationProject.slug}`}
              prefetch={true}
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
    console.error("Error loading project:", error);
    return (
      <div className="p-2">
        <h1>Error loading project</h1>
      </div>
    )
  }
}
