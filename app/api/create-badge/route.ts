import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, icon } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: 'Badge name and description are required' },
        { status: 400 }
      );
    }

    // Use the Firebase REST API with a service account token or database secret
    const databaseUrl = process.env.FIREBASE_DATABASE_URL;
    const dbSecret = process.env.FIREBASE_DATABASE_SECRET;

    if (!databaseUrl || !dbSecret) {
      return NextResponse.json(
        { error: 'Firebase credentials not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${databaseUrl}/badges.json?auth=${dbSecret}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        icon: icon || '⭐',
        createdAt: Date.now()
      })
    });

    if (!response.ok) {
      throw new Error(`Firebase error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      badgeId: data.name,
      badge: { id: data.name, name, description, icon: icon || '⭐' }
    });
  } catch (error: any) {
    console.error('Error creating badge:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create badge' },
      { status: 500 }
    );
  }
}
