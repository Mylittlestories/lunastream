import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    // Use browser-like headers to avoid blocks
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
      },
      signal: AbortSignal.timeout(20000),
      redirect: 'follow',
    });

    const data = await response.text();

    // Check if response is valid JSON (not Cloudflare HTML, etc.)
    try {
      JSON.parse(data);
    } catch {
      // Response is not JSON (likely Cloudflare block or error page)
      console.warn(`Non-JSON response from ${targetUrl}: ${data.substring(0, 100)}...`);
      // Return empty streams for stream endpoints, or empty object for others
      if (targetUrl.includes('/stream/')) {
        return NextResponse.json({ streams: [] }, { status: 200 });
      }
      return NextResponse.json({ metas: [], meta: {}, error: 'Addon blocked or unavailable' }, { status: 200 });
    }
    
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error: any) {
    console.error('Proxy error:', error.message);
    // Return empty data instead of error so the app doesn't crash
    if (targetUrl.includes('/stream/')) {
      return NextResponse.json({ streams: [] }, { status: 200 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch from addon', details: error.message },
      { status: 200 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
