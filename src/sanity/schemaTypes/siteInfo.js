import {defineField, defineType} from 'sanity'

export const siteInfo = defineType({
  name: 'siteInfo',
  title: 'Site Information',
  type: 'document',
  // Since this should be a singleton (only one instance)
  __experimental_actions: [/*'create',*/ 'update', /*'delete',*/ 'publish'],
  fields: [
    defineField({
      name: 'title',
      title: 'Site Title',
      type: 'string',
      description: 'The title of the site',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'keywords',
      title: 'Meta Keywords',
      type: 'string',
      description: 'SEO keywords separated by commas (e.g., "photography, portfolio, art")',
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'text',
      description: 'Bio text displayed in the navigation overlay and used for meta description',
      rows: 4
    }),
    defineField({
      name: 'contactText',
      title: 'Contact Text',
      type: 'text',
      description: 'Text displayed above the contact information',
      rows: 2
    }),
    defineField({
      name: 'email',
      title: 'Email Address',
      type: 'string',
      description: 'Contact email address'
    }),
    defineField({
      name: 'instagramLink',
      title: 'Instagram Link',
      type: 'url',
      description: 'URL to Instagram profile'
    }),
    defineField({
      name: 'instagramText',
      title: 'Instagram Text',
      type: 'string',
      description: 'Text to display for Instagram link (default: "Instagram")',
      initialValue: 'Instagram'
    }),
    defineField({
      name: 'faviconSection',
      title: 'Favicon Settings',
      type: 'object',
      options: {
        collapsible: true,
        collapsed: false,
      },
      fields: [
        defineField({
          name: 'faviconICO',
          title: 'Favicon ICO (32x32)',
          type: 'file',
          description: 'Upload .ico file for standard browser compatibility (32x32)',
          options: {
            accept: '.ico'
          }
        }),
        defineField({
          name: 'faviconSVG',
          title: 'Favicon SVG',
          type: 'file',
          description: 'Upload scalable vector SVG for modern browsers',
          options: {
            accept: '.svg'
          }
        }),
        defineField({
          name: 'favicon32',
          title: 'Favicon PNG (32x32)',
          type: 'image',
          description: 'Upload 32x32 PNG favicon for retina displays',
        }),
        defineField({
          name: 'favicon180',
          title: 'Apple Touch Icon (180x180)',
          type: 'image',
          description: 'Upload 180x180 PNG for Apple devices',
        }),
        defineField({
          name: 'favicon192',
          title: 'Android Icon (192x192)',
          type: 'image',
          description: 'Upload 192x192 PNG for Android devices',
        }),
        defineField({
          name: 'favicon512',
          title: 'PWA Icon (512x512)',
          type: 'image',
          description: 'Upload 512x512 PNG for Progressive Web Apps',
        }),
      ]
    }),
  ],
  preview: {
    select: {
      title: 'title'
    }
  }
}) 