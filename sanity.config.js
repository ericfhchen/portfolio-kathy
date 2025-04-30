'use client'

import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schema} from './src/sanity/schemaTypes'
import {structure} from './src/sanity/structure'
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
        // Get the default structure items
        const defaultItems = structure(S, context).getItems()
        
        // Find the index of imageProjects in the default items (if it exists)
        const imageProjectsIndex = defaultItems.findIndex(
          item => item.getId() === 'imageProjects'
        )
        
        // Find the index of videoProjects in the default items (if it exists)
        const videoProjectsIndex = defaultItems.findIndex(
          item => item.getId() === 'videoProjects'
        )
        
        // Create a new list of items, replacing imageProjects with the orderable version
        let items = [...defaultItems]
        
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