'use client'

import Link from 'next/link'

/**
 * Presentation is accessed within the Sanity Studio, not as a standalone route.
 * This page provides clear instructions on how to access it.
 */
export default function PresentationPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-6">Sanity Presentation</h1>

        <div className="bg-gray-900 rounded-lg p-8 mb-8 text-left">
          <h2 className="text-2xl font-semibold mb-4">How to Access Visual Editing</h2>

          <ol className="space-y-4 text-lg text-gray-300">
            <li className="flex gap-4">
              <span className="font-bold text-orange-500 flex-shrink-0">1.</span>
              <span>Open the <Link href="/studio" className="text-blue-400 underline">Sanity Studio</Link></span>
            </li>
            <li className="flex gap-4">
              <span className="font-bold text-orange-500 flex-shrink-0">2.</span>
              <span>Open any document you want to edit (e.g., "Hero Section")</span>
            </li>
            <li className="flex gap-4">
              <span className="font-bold text-orange-500 flex-shrink-0">3.</span>
              <span>Look for the <strong>"Presentation"</strong> tab in the top navigation bar</span>
            </li>
            <li className="flex gap-4">
              <span className="font-bold text-orange-500 flex-shrink-0">4.</span>
              <span>Click it to see a live preview of your website with Draft Mode enabled</span>
            </li>
          </ol>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <p className="text-gray-400 text-sm">
            <strong>Note:</strong> Presentation is a tool within Sanity Studio, not a separate application.
            It provides visual editing with real-time preview of your changes before publishing.
          </p>
        </div>

        <Link
          href="/studio"
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg transition"
        >
          Open Studio →
        </Link>
      </div>
    </div>
  )
}
