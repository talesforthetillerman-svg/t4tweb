import { defineField, defineType } from "sanity"

export const homeEditorState = defineType({
  name: "homeEditorState",
  title: "Home Editor State",
  type: "document",
  fields: [
    defineField({
      name: "nodesJson",
      title: "Nodes JSON",
      type: "text",
    }),
    defineField({ name: "updatedAt", type: "datetime" }),
  ],
  preview: {
    select: {
      updatedAt: "updatedAt",
      nodesJson: "nodesJson",
    },
    prepare({ updatedAt, nodesJson }) {
      let count = 0
      try {
        const parsed = typeof nodesJson === "string" ? JSON.parse(nodesJson) : []
        count = Array.isArray(parsed) ? parsed.length : 0
      } catch {
        count = 0
      }
      return {
        title: "Home Editor State",
        subtitle: `${count} nodes · ${updatedAt || "never updated"}`,
      }
    },
  },
})

export default homeEditorState
