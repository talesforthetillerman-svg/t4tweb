import { defineArrayMember, defineField, defineType } from "sanity"

export default defineType({
  name: "homeEditorState",
  title: "Home Editor State",
  type: "document",
  fields: [
    defineField({ name: "updatedAt", type: "datetime" }),
    defineField({
      name: "nodes",
      title: "Node Overrides",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({ name: "nodeId", type: "string", validation: (rule) => rule.required() }),
            defineField({ name: "nodeType", type: "string", validation: (rule) => rule.required() }),
            defineField({
              name: "geometry",
              type: "object",
              fields: [
                defineField({ name: "x", type: "number" }),
                defineField({ name: "y", type: "number" }),
                defineField({ name: "width", type: "number" }),
                defineField({ name: "height", type: "number" }),
              ],
            }),
            defineField({
              name: "style",
              type: "object",
              fields: [
                defineField({ name: "color", type: "string" }),
                defineField({ name: "backgroundColor", type: "string" }),
                defineField({ name: "opacity", type: "number" }),
                defineField({ name: "contrast", type: "number" }),
                defineField({ name: "saturation", type: "number" }),
                defineField({ name: "brightness", type: "number" }),
                defineField({ name: "negative", type: "boolean" }),
                defineField({ name: "fontSize", type: "string" }),
                defineField({ name: "fontFamily", type: "string" }),
                defineField({ name: "fontWeight", type: "string" }),
                defineField({ name: "fontStyle", type: "string" }),
                defineField({ name: "textDecoration", type: "string" }),
                defineField({ name: "scale", type: "number" }),
                defineField({ name: "minHeight", type: "string" }),
                defineField({ name: "paddingTop", type: "string" }),
                defineField({ name: "paddingBottom", type: "string" }),
              ],
            }),
            defineField({
              name: "content",
              type: "object",
              fields: [
                defineField({ name: "text", type: "text" }),
                defineField({ name: "href", type: "string" }),
                defineField({ name: "src", type: "string" }),
                defineField({ name: "alt", type: "string" }),
                defineField({ name: "videoUrl", type: "string" }),
                defineField({ name: "mediaKind", type: "string" }),
              ],
            }),
            defineField({ name: "explicitContent", type: "boolean" }),
            defineField({ name: "explicitStyle", type: "boolean" }),
            defineField({ name: "explicitPosition", type: "boolean" }),
            defineField({ name: "explicitSize", type: "boolean" }),
            defineField({ name: "updatedAt", type: "datetime" }),
          ],
        }),
      ],
    }),
  ],
  preview: {
    select: {
      updatedAt: "updatedAt",
      nodeCount: "nodes",
    },
    prepare({ updatedAt, nodeCount }) {
      return {
        title: "Home Editor State",
        subtitle: `${Array.isArray(nodeCount) ? nodeCount.length : 0} nodes · ${updatedAt || "never updated"}`,
      }
    },
  },
})
