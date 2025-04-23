import {defineField, defineType} from 'sanity'

export const imageProjects = defineType({
  name: 'imageProjects',
  title: 'Image Projects',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      type: 'string',
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
      },
    }),
    defineField({
      name: 'client',
      title: 'Client',
      type: 'reference',
      to: [{type: 'clients'}],
      description: 'Select the client for this project',
    }),
    defineField({
      name: 'projectTagline',
      title: 'Project Tagline',
      type: 'string',
      description: 'This will be displayed below the client name on projects. i.e. "Social Campaign"',
    }),
    defineField({
      name: 'coverImage',
      type: 'image',
    }),
    defineField({
      name: 'credits',
      type: 'array',
      of: [{type: 'block'}]
    }),
    defineField({
      name: 'images',
      type: 'array',
      of: [{type: 'image'}],
      options: {
        layout: 'grid'
      }
    })
  ],
})