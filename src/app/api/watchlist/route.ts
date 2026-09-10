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

    const watchlist = await prisma.watchlistItem.findMany({
      where: { userId: payload.userId },
      orderBy: { addedAt: 'desc' }
    });

    return NextResponse.json({ watchlist });
  } catch (error) {
    console.error('Get watchlist error:', error);
    return NextResponse.json(
      { error: 'Failed to get watchlist' },
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

    const { tmdbId, imdbId, type, title, poster, backdrop, year, rating } = await request.json();

    if (!imdbId || !type || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const item = await prisma.watchlistItem.create({
      data: {
        userId: payload.userId,
        tmdbId: tmdbId || 0,
        imdbId,
        type,
        title,
        poster,
        backdrop,
        year,
        rating
      }
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Item already in watchlist' },
        { status: 400 }
      );
    }
    console.error('Add to watchlist error:', error);
    return NextResponse.json(
      { error: 'Failed to add to watchlist' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const payload = await getCurrentUser();
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { imdbId } = await request.json();

    if (!imdbId) {
      return NextResponse.json(
        { error: 'IMDb ID is required' },
        { status: 400 }
      );
    }

    await prisma.watchlistItem.deleteMany({
      where: {
        userId: payload.userId,
        imdbId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove from watchlist error:', error);
    return NextResponse.json(
      { error: 'Failed to remove from watchlist' },
      { status: 500 }
    );
  }
}
