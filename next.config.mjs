/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Cloudflare deployments can fail on the default Next.js image optimizer endpoint.
    // Keep Next/Image component behavior but serve original assets directly.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        pathname: '/images/**',
      },
    ],
  },
}

export default nextConfig
