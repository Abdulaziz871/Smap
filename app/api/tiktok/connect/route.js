import { NextResponse } from 'next/server';
import { getTikTokAuthUrl } from '../../../../utils/tiktok';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const authUrl = getTikTokAuthUrl(userId);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating TikTok connection:', error);
    return NextResponse.json({ error: 'Failed to initiate connection' }, { status: 500 });
  }
}
