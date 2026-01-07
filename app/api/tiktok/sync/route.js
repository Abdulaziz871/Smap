import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { getTikTokUserStats } from '../../../../utils/tiktok';

export async function POST(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('smap_db');

    // Find TikTok type
    const tiktokType = await db.collection('socialmediatypes').findOne({
      SMType_Description: 'TikTok'
    });

    if (!tiktokType) {
      return NextResponse.json({ error: 'TikTok type not found' }, { status: 404 });
    }

    // Get TikTok account
    const account = await db.collection('socialmediaaccounts').findOne({
      user_id: new ObjectId(userId),
      SMType_ID: tiktokType._id,
      is_active: true
    });

    if (!account) {
      return NextResponse.json({ error: 'TikTok account not connected' }, { status: 404 });
    }

    // Get user stats from TikTok API
    const stats = await getTikTokUserStats(account.access_token);

    // Update last sync time
    await db.collection('socialmediaaccounts').updateOne(
      { _id: account._id },
      { $set: { last_sync_at: new Date() } }
    );

    return NextResponse.json({ 
      success: true, 
      message: 'TikTok data synced successfully',
      stats 
    });
  } catch (error) {
    console.error('Error syncing TikTok data:', error);
    return NextResponse.json({ error: 'Failed to sync TikTok data' }, { status: 500 });
  }
}
