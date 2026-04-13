import HomePagePublic from "./home-page-public"

// Force dynamic rendering to ensure fresh data on every request
// This prevents Next.js caching from masking stale Sanity data
export const dynamic = "force-dynamic"

export default async function Home() {
  return <HomePagePublic />
}