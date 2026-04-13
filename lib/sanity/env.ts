export function resolveSanityProjectId(): string {
  const serverProjectId = process.env.SANITY_PROJECT_ID?.trim()
  const publicProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim()

  if (
    process.env.NODE_ENV !== "production" &&
    serverProjectId &&
    publicProjectId &&
    serverProjectId !== publicProjectId
  ) {
    console.warn("[sanity-env] Project ID mismatch", {
      SANITY_PROJECT_ID: serverProjectId,
      NEXT_PUBLIC_SANITY_PROJECT_ID: publicProjectId,
      chosen: serverProjectId,
    })
  }

  return serverProjectId || publicProjectId || "qtpb6qpz"
}

export function resolveSanityDataset(): string {
  return process.env.SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
}

export function getTraceNodeId(): string | null {
  const nodeId =
    process.env.HOME_EDITOR_TRACE_NODE_ID?.trim() ||
    process.env.NEXT_PUBLIC_HOME_EDITOR_TRACE_NODE_ID?.trim()
  return nodeId ? nodeId : null
}
