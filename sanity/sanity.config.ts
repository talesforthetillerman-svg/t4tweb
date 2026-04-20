import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { presentationTool } from 'sanity/presentation'
import { schemas } from './schemas'
import { structure } from './structure'
import { getPreviewUrl } from './lib/preview-url'

export default defineConfig({
  name: 't4t-studio',
  title: 'Tales for the Tillerman CMS',
  projectId: 'qtpb6qpz',
  dataset: 'production',
  basePath: '/studio',
  plugins: [
    structureTool({ structure }),
    visionTool(),
    presentationTool({
      previewUrl: getPreviewUrl(),
    }),
  ],
  schema: { types: schemas },
})