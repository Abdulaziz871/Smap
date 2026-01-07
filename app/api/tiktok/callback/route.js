import { NextResponse } from 'next/server';
import { getTikTokTokens, getTikTokUserInfo } from '../../../../utils/tiktok';
import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle user cancellation
    if (error === 'user_cancel') {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/connect?error=access_denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/connect?error=invalid_request`);
    }

    // Decode state to get userId
    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
    const userId = decodedState.userId;

    // Exchange code for tokens
    const tokenData = await getTikTokTokens(code);
    
    if (!tokenData.access_token) {
      throw new Error('No access token received');
    }

    // Get user info
    const userInfo = await getTikTokUserInfo(tokenData.access_token);
    
    // Connect to database
    const client = await clientPromise;
    const db = client.db('smap_db');

    // Find TikTok social media type
    const tiktokType = await db.collection('socialmediatypes').findOne({
      SMType_Description: 'TikTok'
    });

    if (!tiktokType) {
      throw new Error('TikTok social media type not found');
    }

    // Calculate token expiration
    const expiresIn = tokenData.expires_in || 86400; // Default 24 hours
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // Store or update social media account
    await db.collection('socialmediaaccounts').updateOne(
      {
        user_id: new ObjectId(userId),
        SMType_ID: tiktokType._id
      },
      {
        $set: {
          username: userInfo.user?.display_name || 'TikTok User',
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: tokenExpiresAt,
          connected_at: new Date(),
          last_sync_at: null,
          is_active: true,
          account_data: {
            open_id: userInfo.user?.open_id,
            union_id: userInfo.user?.union_id,
            avatar_url: userInfo.user?.avatar_url,
            profile_url: userInfo.user?.profile_deep_link
          }
        }
      },
      { upsert: true }
    );

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/connect?success=tiktok_connected`);
  } catch (error) {
    console.error('TikTok callback error:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/connect?error=processing_failed`);
  }
}
