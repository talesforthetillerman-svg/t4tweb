import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemas } from './schemas'

export default defineConfig({
  name: 't4t-studio',
  title: 'Tales for the Tillerman CMS',
  projectId: 'qtpb6qpz',
  dataset: 'production',
  basePath: '/studio',
  plugins: [structureTool()],
  schema: { types: schemas },
})
