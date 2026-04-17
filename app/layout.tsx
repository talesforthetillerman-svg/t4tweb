import type { Metadata, Viewport } from "next"
import "./globals.css"
import { VisualEditorProvider } from "@/components/visual-editor"
import { EditorOverlayWrapper } from "@/components/editor-overlay-wrapper"
import { draftMode } from 'next/headers'
import { SanityVisualEditing } from "@/components/sanity-visual-editing"

export const metadata: Metadata = {
  metadataBase: new URL("https://talesforthetillerman.com"),
  title: "Tales for the Tillerman | Berlin World Music Band",
  description:
    "Berlin-based world music collective blending funk, soul, and reggae. Professional press kit, live performances, and booking information.",
  keywords: [
    "Tales for the Tillerman",
    "Berlin band",
    "world music",
    "funk band",
    "soul music",
    "reggae",
    "press kit",
    "booking agency",
    "live performances",
    "music festival",
  ],
  authors: [{ name: "Tales for the Tillerman" }],
  creator: "Tales for the Tillerman",
  category: "Music",
  openGraph: {
    title: "Tales for the Tillerman | Berlin World Music Band",
    description:
      "Groove, warmth, rhythm, and energy from five Berlin-based musicians. Experience world music fusion.",
    type: "website",
    locale: "en_US",
    url: "https://talesforthetillerman.com",
    siteName: "Tales for the Tillerman",
    images: [
      {
        url: "/images/t4tPics/logo-white.png",
        width: 1200,
        height: 630,
        alt: "Tales for the Tillerman Band Logo",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tales for the Tillerman | Berlin World Music Band",
    description: "Groove, warmth, rhythm, and energy from five Berlin-based musicians.",
    creator: "@tales4tillerman",
    images: ["/images/t4tPics/logo-white.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://talesforthetillerman.com",
  },
  icons: {
    icon: "/images/logo-qr.png",
    shortcut: "/images/logo-qr.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const draft = await draftMode()
  const isDraft = draft.isEnabled

  return (
    <html lang="en">
      <head>
        {/* JSON-LD Schema for Band/Music Group */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "MusicGroup",
              "@id": "https://talesforthetillerman.com",
              name: "Tales for the Tillerman",
              image: "/images/t4tPics/logo-white.png",
              description: "Berlin-based world music collective blending funk, soul, and reggae.",
              url: "https://talesforthetillerman.com",
              sameAs: [
                "https://www.instagram.com/tales4tillerman",
                "https://open.spotify.com/artist/0FHjK3O0k8HQMrJsF7KQwF",
                "https://www.youtube.com/@Tales4Tillerman",
              ],
              location: {
                "@type": "City",
                name: "Berlin",
                address: {
                  "@type": "PostalAddress",
                  addressCountry: "DE",
                },
              },
              memberOf: {
                "@type": "Organization",
                name: "Tales for the Tillerman",
              },
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "Booking",
                email: "talesforthetillerman@gmail.com",
                telephone: "+49-160-90615287",
              },
            }),
          }}
        />

        {/* JSON-LD Schema for Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Tales for the Tillerman",
              url: "https://talesforthetillerman.com",
              logo: "/images/t4tPics/logo-white.png",
              description: "Berlin-based world music collective",
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "Customer Service",
                email: "talesforthetillerman@gmail.com",
              },
              sameAs: [
                "https://www.instagram.com/tales4tillerman",
                "https://open.spotify.com/artist/0FHjK3O0k8HQMrJsF7KQwF",
                "https://www.youtube.com/@Tales4Tillerman",
              ],
            }),
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <VisualEditorProvider>
          <EditorOverlayWrapper />
          {children}
        </VisualEditorProvider>
        {isDraft && <SanityVisualEditing />}
      </body>
    </html>
  )
}
