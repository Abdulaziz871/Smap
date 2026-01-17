import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb.js';
import { User } from '../../../../models/User.js';
import { getContentRecommendations } from '../../../../utils/ai';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const platform = searchParams.get('platform') || 'all';

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await connectDB();
    
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prepare analytics data
    const analyticsData = {
      facebookData: user.facebookData || null,
      youtubeData: user.youtubeData || null,
      instagramData: user.instagramData || null,
    };

    // Check if user has any connected accounts
    const hasConnectedAccounts = 
      user.facebookData?.isConnected || 
      user.youtubeData?.isConnected || 
      user.instagramData?.isConnected;

    if (!hasConnectedAccounts) {
      return NextResponse.json({
        success: false,
        error: 'No social media accounts connected. Please connect at least one account to get recommendations.',
      }, { status: 400 });
    }

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'AI service not configured. Please add GEMINI_API_KEY to environment variables.',
      }, { status: 500 });
    }

    // Get AI recommendations
    const recommendations = await getContentRecommendations(analyticsData, platform);

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Error getting AI recommendations:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, platform, customData } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await connectDB();
    
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prepare analytics data, merging with custom data if provided
    const analyticsData = {
      facebookData: customData?.facebookData || user.facebookData || null,
      youtubeData: customData?.youtubeData || user.youtubeData || null,
      instagramData: customData?.instagramData || user.instagramData || null,
    };

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'AI service not configured. Please add GEMINI_API_KEY to environment variables.',
      }, { status: 500 });
    }

    // Get AI recommendations
    const recommendations = await getContentRecommendations(analyticsData, platform || 'all');

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Error getting AI recommendations:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
