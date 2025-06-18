import { NextResponse } from "next/server"

export async function GET() {
  try {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const apiKey = process.env.GOOGLE_API_KEY

    return NextResponse.json({
      hasClientId: !!clientId,
      hasApiKey: !!apiKey,
      clientIdLength: clientId?.length || 0,
      apiKeyLength: apiKey?.length || 0,
      isConfigured: !!(clientId && apiKey),
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        hasClientId: false,
        hasApiKey: false,
        isConfigured: false,
      },
      { status: 500 },
    )
  }
}
