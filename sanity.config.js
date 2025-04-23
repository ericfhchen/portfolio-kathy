'use client'

/**
 * This configuration is used to for the Sanity Studio that's mounted on the `/app/studio/[[...tool]]/page.jsx` route
 */

import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schema} from './src/sanity/schemaTypes'
import {structure} from './src/sanity/structure'
import {apiVersion, dataset, projectId} from './src/sanity/env'
import { muxInput } from 'sanity-plugin-mux-input'

export default defineConfig({
  basePath: '/studio',
  projectId,
  dataset,
  schema: {
    types: schema.types,
  },
  plugins: [
    structureTool({structure}),
    muxInput({
      mux: {
        tokenId: process.env.SANITY_STUDIO_MUX_TOKEN_ID,
        tokenSecret: process.env.SANITY_STUDIO_MUX_TOKEN_SECRET,
      }
    })
  ],
})
