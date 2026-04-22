"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function EditorLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/editor-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      
      if (response.ok) {
        // Set auth cookie
        document.cookie = "t4t-editor-auth=authorized; path=/; max-age=86400"
        router.push("/editor")
      }
    } catch (error) {
      console.error("Login failed:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="bg-secondary/50 border border-border rounded-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-serif text-foreground mb-4">Editor Access</h1>
        <p className="text-muted-foreground mb-6">
          Click the button below to access the visual editor.
        </p>
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : "Enter Editor"}
        </button>
      </div>
    </div>
  )
}

