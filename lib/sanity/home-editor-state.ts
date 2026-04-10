export type HomeEditorNodeType = "section" | "background" | "card" | "text" | "button" | "image"

export interface HomeEditorNodeGeometry {
  x: number
  y: number
  width: number
  height: number
}

export interface HomeEditorNodeStyle {
  color?: string
  backgroundColor?: string
  opacity?: number
  contrast?: number
  saturation?: number
  brightness?: number
  negative?: boolean
  fontSize?: string
  fontFamily?: string
  fontWeight?: string
  fontStyle?: string
  textDecoration?: string
  textAlign?: "left" | "center" | "right"
  scale?: number
  minHeight?: string
  paddingTop?: string
  paddingBottom?: string
}

export interface HomeEditorNodeContent {
  text?: string
  textSegments?: Array<{
    text: string
    color?: string
    bold?: boolean
    italic?: boolean
    underline?: boolean
    opacity?: number
    fontSize?: string
    fontFamily?: string
    gradientEnabled?: boolean
    gradientStart?: string
    gradientEnd?: string
  }>
  titleSegments?: Array<{
    text: string
    color?: string
    bold?: boolean
    italic?: boolean
    underline?: boolean
    opacity?: number
    fontSize?: string
    fontFamily?: string
    gradientEnabled?: boolean
    gradientStart?: string
    gradientEnd?: string
  }>
  href?: string
  src?: string
  alt?: string
  videoUrl?: string
  mediaKind?: "image" | "video"
  gradientEnabled?: boolean
  gradientStart?: string
  gradientEnd?: string
  date?: string
  venue?: string
  city?: string
  country?: string
  genre?: string
  price?: string
  status?: string
  time?: string
  capacity?: string
  locationUrl?: string
}

export interface HomeEditorNodeOverride {
  nodeId: string
  nodeType: HomeEditorNodeType
  geometry: HomeEditorNodeGeometry
  style: HomeEditorNodeStyle
  content: HomeEditorNodeContent
  explicitContent: boolean
  explicitStyle: boolean
  explicitPosition: boolean
  explicitSize: boolean
  updatedAt: string
}

export interface HomeEditorStateDocument {
  _id: string
  _type: "homeEditorState"
  updatedAt?: string
  nodes: HomeEditorNodeOverride[]
}
