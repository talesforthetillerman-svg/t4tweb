import { groq } from 'next-sanity'

export const heroQuery = groq`*[_type == "heroSection"][0]{
  title,
  titleHighlight,
  titleSegments[]{
    text,
    color,
    bold,
    italic,
    underline,
    opacity,
    fontSize,
    fontFamily
  },
  subtitle,
  description,
  "logoUrl": logo.asset->url,
  "bgUrl": backgroundImage.asset->url
}`

export const aboutQuery = groq`*[_type == "aboutSection"][0]{
  eyebrow,
  title,
  bioParagraphs,
  bioTagline,
  "bgUrl": backgroundImage.asset->url
}`

export const bandMembersQuery = groq`*[_type == "bandMember"] | order(order asc){
  fullName,
  role,
  "imageUrl": portraitImage.asset->url,
  order
}`

export const concertsQuery = groq`*[_type == "concert"] | order(date desc){
  venue,
  city,
  country,
  date,
  time,
  status,
  genre,
  capacity,
  price
}`

export const pressKitQuery = groq`*[_type == "pressKitSection"][0]{
  eyebrow,
  title,
  description,
  "pressKitPdfUrl": pressKitPdf.asset->url,
  resources[]{ title, description, href },
  "managerPhotoUrl": managerPhoto.asset->url,
  managerName,
  managerRole,
  managerEmail,
  "bgUrl": backgroundImage.asset->url
}`

export const contactQuery = groq`*[_type == "contactSection"][0]{
  eyebrow,
  title,
  description,
  contactMethods[]{ title, description, href, label, contactName },
  "bgUrl": backgroundImage.asset->url
}`

export const latestReleaseQuery = groq`*[_type == "latestRelease"][0]{
  title,
  subtitle,
  youtubeId,
  ctaButtons[]{ label, href }
}`

export const siteSettingsQuery = groq`*[_type == "siteSettings"][0]{
  siteTitle,
  siteDescription,
  footerTagline,
  "ogImageUrl": ogImage.asset->url,
  socialLinks[]{ name, url },
  streamingPlatforms[]{ name, url }
}`

export const navigationQuery = groq`*[_type == "navigation"][0]{
  brandName,
  "brandLogoUrl": brandLogo.asset->url,
  links[]{ label, href },
  ctaLabel,
  ctaHref,
  elementStyles
}`
