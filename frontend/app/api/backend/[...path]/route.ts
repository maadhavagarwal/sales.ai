import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const resolveBackendUrl = () => {
  const rawCandidates = [
    process.env.BACKEND_INTERNAL_URL,
    process.env.NEXT_PUBLIC_BACKEND_INTERNAL_URL,
    process.env.NEXT_PUBLIC_API_URL,
    "http://127.0.0.1:8000",
  ]

  for (const candidate of rawCandidates) {
    const value = (candidate || "").trim()
    if (!value || !/^https?:\/\//i.test(value)) continue
    // If someone passes a public proxy URL here, map it to backend root.
    return value.replace(/\/api\/backend\/?$/i, "")
  }
  return "http://127.0.0.1:8000"
}

const BACKEND_URL = resolveBackendUrl()

async function proxy(request: NextRequest, path: string[]) {
  const targetUrl = new URL(`${BACKEND_URL}/${path.join("/")}`)
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value)
  })

  const headers = new Headers(request.headers)
  headers.delete("host")
  headers.delete("connection")
  headers.delete("content-length")

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
    cache: "no-store",
  }

  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = await request.arrayBuffer()
  }

  try {
    const response = await fetch(targetUrl, init)
    const responseHeaders = new Headers(response.headers)
    responseHeaders.delete("content-encoding")
    responseHeaders.delete("transfer-encoding")

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown backend connection error"
    return NextResponse.json(
      {
        error: "Backend proxy connection failed",
        detail: message,
        target: targetUrl.toString(),
      },
      { status: 502 }
    )
  }
}

type RouteContext = {
  params: Promise<{ path: string[] }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxy(request, path)
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxy(request, path)
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxy(request, path)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxy(request, path)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxy(request, path)
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxy(request, path)
}
