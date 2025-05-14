'use client'

import {defineConfig} from 'sanity'
import {structureTool, defaultDocumentNodeResolver} from 'sanity/structure'
import {schema} from './src/sanity/schemaTypes'

import {apiVersion, dataset, projectId} from './src/sanity/env'
import {muxInput} from 'sanity-plugin-mux-input'
import {orderableDocumentListDeskItem} from '@sanity/orderable-document-list'

export default defineConfig({
  basePath: '/studio',
  projectId,
  dataset,
  schema: {
    types: schema.types,
  },
  plugins: [
    structureTool({
      structure: (S, context) => {
        // Use the S.documentTypeListItems() function directly instead of the undefined structure variable
        const defaultItems = S.documentTypeListItems()
        
        // Find the index of imageProjects in the default items (if it exists)
        const imageProjectsIndex = defaultItems.findIndex(
          item => item.getId() === 'imageProjects'
        )
        
        // Find the index of videoProjects in the default items (if it exists)
        const videoProjectsIndex = defaultItems.findIndex(
          item => item.getId() === 'videoProjects'
        )
        
        // Find the index of clients in the default items (if it exists)
        const clientsIndex = defaultItems.findIndex(
          item => item.getId() === 'clients'
        )
        
        // Find and filter out siteInfo as it will be a singleton
        const filteredItems = defaultItems.filter(
          item => item.getId() !== 'siteInfo'
        )
        
        // Create a new list of items, replacing imageProjects with the orderable version
        let items = [...filteredItems]
        
        // Replace imageProjects with orderable version if it exists, otherwise add it
        const orderableImageProjects = orderableDocumentListDeskItem({
          type: 'imageProjects',
          title: 'Image Projects',
          S,
          context,
        })
        
        // Create orderable video projects item
        const orderableVideoProjects = orderableDocumentListDeskItem({
          type: 'videoProjects',
          title: 'Video Projects',
          S,
          context,
        })
        
        // Create orderable clients item
        const orderableClients = orderableDocumentListDeskItem({
          type: 'clients',
          title: 'Clients',
          S,
          context,
        })
        
        if (imageProjectsIndex !== -1) {
          items[imageProjectsIndex] = orderableImageProjects
        } else {
          items.push(orderableImageProjects)
        }
        
        // Replace videoProjects with orderable version if it exists, otherwise add it
        if (videoProjectsIndex !== -1) {
          items[videoProjectsIndex] = orderableVideoProjects
        } else {
          items.push(orderableVideoProjects)
        }
        
        // Replace clients with orderable version if it exists, otherwise add it
        if (clientsIndex !== -1) {
          items[clientsIndex] = orderableClients
        } else {
          items.push(orderableClients)
        }
        
        // Add the Site Information singleton
        items.push(
          S.listItem()
            .title('Site Information')
            .child(
              S.editor()
                .title('Site Information')
                .schemaType('siteInfo')
                .documentId('siteInfo')
            )
        )
        
        return S.list()
          .title('Content')
          .items(items)
      }
    }),
    muxInput({
      mux: {
        tokenId: process.env.SANITY_STUDIO_MUX_TOKEN_ID,
        tokenSecret: process.env.SANITY_STUDIO_MUX_TOKEN_SECRET,
      }
    })
  ],
}) 