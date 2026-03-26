import type { Metadata, Viewport } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import "./globals.css"

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter"
})

const playfair = Playfair_Display({ 
  subsets: ["latin"],
  variable: "--font-playfair"
})

export const metadata: Metadata = {
  title: "Tales for the Tillerman | Press Kit",
  description: "Berlin-based band blending world music, funk, and soul. Press kit, booking info, and media resources.",
  keywords: ["Tales for the Tillerman", "Berlin band", "world music", "press kit", "booking"],
  authors: [{ name: "Tales for the Tillerman" }],
  openGraph: {
    title: "Tales for the Tillerman | Press Kit",
    description: "Berlin-based band blending world music, funk, and soul.",
    type: "website",
    images: ["/images/band-hero.jpg"],
  },
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
