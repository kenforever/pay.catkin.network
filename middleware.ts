import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Clone the request headers
  const requestHeaders = new Headers(request.headers)

  // Add API base URL for backend requests
  const apiUrl = process.env.API_BASE_URL || "http://localhost:8000"

  // Check if the request is for the API
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Rewrite the URL to the actual backend API
    const newUrl = new URL(request.nextUrl.pathname.replace(/^\/api/, ""), apiUrl)

    // Copy query parameters
    request.nextUrl.searchParams.forEach((value, key) => {
      newUrl.searchParams.append(key, value)
    })

    return NextResponse.rewrite(newUrl)
  }

  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: "/api/:path*",
}

