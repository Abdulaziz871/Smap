import connectDB from '../../../../lib/mongodb.js';
import { User } from '../../../../models/User.js';
import { getYouTubeAnalytics, verifyYouTubeToken, refreshYouTubeToken } from '../../../../utils/youtube.js';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    if (!userId) {
      return Response.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Get user with YouTube data
    const user = await User.findById(userId);
    console.log('🔍 GET User lookup for analytics:', {
      userId,
      userFound: !!user,
      hasYoutubeData: !!user?.youtubeData,
      isConnected: user?.youtubeData?.isConnected,
      hasAccessToken: !!user?.youtubeData?.accessToken
    });
    
    if (!user || !user.youtubeData || !user.youtubeData.isConnected) {
      console.log('❌ GET YouTube not connected check failed:', {
        userExists: !!user,
        youtubeDataExists: !!user?.youtubeData,
        isConnected: user?.youtubeData?.isConnected
      });
      return Response.json(
        { error: 'YouTube account not connected' },
        { status: 400 }
      );
    }
    
    let accessToken = user.youtubeData.accessToken;
    
    // Verify if current token is still valid
    const isTokenValid = await verifyYouTubeToken(accessToken);
    
    if (!isTokenValid && user.youtubeData.refreshToken) {
      try {
        // Try to refresh the token
        const newTokens = await refreshYouTubeToken(user.youtubeData.refreshToken);
        accessToken = newTokens.access_token;
        
        // Update user with new tokens
        await User.findByIdAndUpdate(userId, {
          $set: {
            'youtubeData.accessToken': newTokens.access_token,
            'youtubeData.refreshToken': newTokens.refresh_token || user.youtubeData.refreshToken
          }
        });
      } catch (refreshError) {
        console.error('Failed to refresh YouTube token:', refreshError);
        return Response.json(
          { error: 'YouTube token expired. Please reconnect your account.' },
          { status: 401 }
        );
      }
    }
    
    // Get analytics data
    const analytics = await getYouTubeAnalytics(
      accessToken, 
      user.youtubeData.channelId,
      startDate,
      endDate
    );
    
    // Store analytics in database for historical tracking
    await User.findByIdAndUpdate(userId, {
      $set: {
        'youtubeData.lastAnalyticsUpdate': new Date(),
        'youtubeData.latestAnalytics': analytics
      }
    });
    
    return Response.json({
      success: true,
      analytics,
      channelInfo: {
        channelId: user.youtubeData.channelId,
        channelTitle: user.youtubeData.channelTitle,
        isConnected: true
      }
    });
    
  } catch (error) {
    console.error('YouTube analytics API error:', error);
    return Response.json(
      { error: 'Failed to fetch YouTube analytics data' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    
    const { userId, forceRefresh } = await request.json();
    
    if (!userId) {
      return Response.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Get user with YouTube data
    const user = await User.findById(userId);
    console.log('🔍 POST User lookup for analytics:', {
      userId,
      userFound: !!user,
      hasYoutubeData: !!user?.youtubeData,
      isConnected: user?.youtubeData?.isConnected,
      hasAccessToken: !!user?.youtubeData?.accessToken
    });
    
    if (!user || !user.youtubeData || !user.youtubeData.isConnected) {
      console.log('❌ POST YouTube not connected check failed:', {
        userExists: !!user,
        youtubeDataExists: !!user?.youtubeData,
        isConnected: user?.youtubeData?.isConnected
      });
      return Response.json(
        { error: 'YouTube account not connected' },
        { status: 400 }
      );
    }
    
    // Check if we have recent analytics (within last hour) and not forcing refresh
    const lastUpdate = user.youtubeData.lastAnalyticsUpdate;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    if (!forceRefresh && lastUpdate && new Date(lastUpdate) > oneHourAgo) {
      return Response.json({
        success: true,
        analytics: user.youtubeData.latestAnalytics,
        fromCache: true,
        channelInfo: {
          channelId: user.youtubeData.channelId,
          channelTitle: user.youtubeData.channelTitle,
          isConnected: true
        }
      });
    }
    
    let accessToken = user.youtubeData.accessToken;
    
    // Verify and refresh token if needed
    const isTokenValid = await verifyYouTubeToken(accessToken);
    
    if (!isTokenValid && user.youtubeData.refreshToken) {
      try {
        const newTokens = await refreshYouTubeToken(user.youtubeData.refreshToken);
        accessToken = newTokens.access_token;
        
        await User.findByIdAndUpdate(userId, {
          $set: {
            'youtubeData.accessToken': newTokens.access_token,
            'youtubeData.refreshToken': newTokens.refresh_token || user.youtubeData.refreshToken
          }
        });
      } catch (refreshError) {
        console.error('Failed to refresh YouTube token:', refreshError);
        return Response.json(
          { error: 'YouTube token expired. Please reconnect your account.' },
          { status: 401 }
        );
      }
    }
    
    // Fetch fresh analytics data
    const analytics = await getYouTubeAnalytics(accessToken, user.youtubeData.channelId);
    
    // Update user with fresh analytics
    await User.findByIdAndUpdate(userId, {
      $set: {
        'youtubeData.lastAnalyticsUpdate': new Date(),
        'youtubeData.latestAnalytics': analytics,
        'youtubeData.subscriberCount': analytics.channelMetrics.subscriberCount,
        'youtubeData.videoCount': analytics.channelMetrics.totalVideoCount,
        'youtubeData.viewCount': analytics.channelMetrics.totalViewCount
      }
    });
    
    return Response.json({
      success: true,
      analytics,
      fromCache: false,
      channelInfo: {
        channelId: user.youtubeData.channelId,
        channelTitle: user.youtubeData.channelTitle,
        isConnected: true
      }
    });
    
  } catch (error) {
    console.error('YouTube analytics POST error:', error);
    return Response.json(
      { error: 'Failed to update YouTube analytics data' },
      { status: 500 }
    );
  }
}
