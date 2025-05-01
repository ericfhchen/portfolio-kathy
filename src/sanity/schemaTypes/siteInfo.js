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
      name: 'bio',
      title: 'Bio',
      type: 'text',
      description: 'Bio text displayed in the navigation overlay',
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
    })
  ],
  preview: {
    select: {
      title: 'title'
    }
  }
}) 