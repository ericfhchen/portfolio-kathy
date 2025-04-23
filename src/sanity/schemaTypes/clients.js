import {defineField, defineType} from 'sanity'

export const clientType = defineType({
  name: 'clients',
  title: 'Clients',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
    }),
    defineField({
      name: 'link',
      type: 'url',
    }),
  ],
})