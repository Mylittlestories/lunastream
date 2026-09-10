import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = '65c06c4a5d4ff2a4e6e398738b93f63f';
const TMDB_BASE = 'https://api.themoviedb.org/3';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  searchParams.delete('path');

  if (!path) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  const params = new URLSearchParams();
  params.set('api_key', TMDB_API_KEY);
  params.set('language', 'en-US');
  
  searchParams.forEach((value, key) => {
    params.set(key, value);
  });

  try {
    const url = `${TMDB_BASE}/${path}?${params.toString()}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json();
    
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('TMDB proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from TMDB', details: error.message },
      { status: 502 }
    );
  }
}
