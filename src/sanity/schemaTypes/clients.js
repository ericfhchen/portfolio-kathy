import {defineField, defineType} from 'sanity'

export const clientType = defineType({
  name: 'clients',
  title: 'Clients',
  type: 'document',
  orderings: [
    {
      title: 'Manual Order',
      name: 'orderingAsc',
      by: [
        {field: 'orderRank', direction: 'asc'}
      ]
    }
  ],
  fields: [
    defineField({
      name: 'title',
      type: 'string',
    }),
    defineField({
      name: 'orderRank',
      title: 'Order Rank',
      type: 'string',
      hidden: true,
    }),
    defineField({
      name: 'link',
      type: 'url',
    }),
    defineField({
      name: 'showInSelectedClients',
      title: 'Show in Selected Clients',
      type: 'boolean',
      description: 'Toggle to show/hide this client in the Selected Clients list',
      initialValue: true,
    }),
  ],
})