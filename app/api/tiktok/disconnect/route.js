import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

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

    // Delete the social media account
    const result = await db.collection('socialmediaaccounts').deleteOne({
      user_id: new ObjectId(userId),
      SMType_ID: tiktokType._id
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'TikTok account not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'TikTok account disconnected' });
  } catch (error) {
    console.error('Error disconnecting TikTok:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
