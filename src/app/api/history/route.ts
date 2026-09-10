import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const payload = await getCurrentUser();
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const history = await prisma.watchHistory.findMany({
      where: { userId: payload.userId },
      orderBy: { lastWatchedAt: 'desc' },
      take: 50 // Limit to last 50 items
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Get history error:', error);
    return NextResponse.json(
      { error: 'Failed to get history' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getCurrentUser();
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { tmdbId, imdbId, type, title, poster, year, season, episode, progress } = await request.json();

    if (!imdbId || !type || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Upsert - create or update
    const item = await prisma.watchHistory.upsert({
      where: {
        userId_imdbId_season_episode: {
          userId: payload.userId,
          imdbId,
          season: season || null,
          episode: episode || null
        }
      },
      update: {
        progress: progress || 0,
        lastWatchedAt: new Date()
      },
      create: {
        userId: payload.userId,
        tmdbId: tmdbId || 0,
        imdbId,
        type,
        title,
        poster,
        year,
        season: season || null,
        episode: episode || null,
        progress: progress || 0
      }
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Update history error:', error);
    return NextResponse.json(
      { error: 'Failed to update history' },
      { status: 500 }
    );
  }
}
