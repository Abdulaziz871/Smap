import connectDB from '@/lib/mongodb.js';
import { User } from '@/models/User.js';
import { getInstagramAnalytics, verifyMetaToken, getInstagramAccountInfo } from '@/utils/meta.js';

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
    
    // Get user with Instagram data
    const user = await User.findById(userId);
    console.log('🔍 GET User lookup for Instagram analytics:', {
      userId,
      userFound: !!user,
      hasInstagramData: !!user?.instagramData,
      isConnected: user?.instagramData?.isConnected,
      hasAccessToken: !!user?.instagramData?.accessToken
    });
    
    if (!user || !user.instagramData || !user.instagramData.isConnected) {
      console.log('❌ GET Instagram not connected check failed:', {
        userExists: !!user,
        instagramDataExists: !!user?.instagramData,
        isConnected: user?.instagramData?.isConnected
      });
      return Response.json(
        { error: 'Instagram account not connected' },
        { status: 400 }
      );
    }
    
    const accessToken = user.instagramData.pageAccessToken;
    const accountId = user.instagramData.accountId;
    
    // Verify if current token is still valid
    const isTokenValid = await verifyMetaToken(accessToken);
    
    if (!isTokenValid) {
      return Response.json(
        { error: 'Instagram token expired. Please reconnect your account.' },
        { status: 401 }
      );
    }
    
    // Get analytics data with date range
    const analytics = await getInstagramAnalytics(
      accessToken,
      accountId,
      startDate,
      endDate
    );
    
    // Get current account info
    const accountInfo = await getInstagramAccountInfo(user.instagramData.accessToken);
    analytics.accountMetrics = {
      followersCount: accountInfo.followersCount,
      mediaCount: accountInfo.mediaCount,
      username: accountInfo.username,
      name: accountInfo.name
    };
    
    // Store analytics in database for historical tracking
    await User.findByIdAndUpdate(userId, {
      $set: {
        'instagramData.lastAnalyticsUpdate': new Date(),
        'instagramData.latestAnalytics': analytics
      }
    });
    
    return Response.json({
      success: true,
      analytics,
      accountInfo: {
        accountId: user.instagramData.accountId,
        username: accountInfo.username,
        isConnected: true
      }
    });
    
  } catch (error) {
    console.error('Instagram analytics API error:', error);
    return Response.json(
      { error: 'Failed to fetch Instagram analytics data' },
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
    
    // Get user with Instagram data
    const user = await User.findById(userId);
    console.log('🔍 POST User lookup for Instagram analytics:', {
      userId,
      userFound: !!user,
      hasInstagramData: !!user?.instagramData,
      isConnected: user?.instagramData?.isConnected,
      hasAccessToken: !!user?.instagramData?.accessToken
    });
    
    if (!user || !user.instagramData || !user.instagramData.isConnected) {
      console.log('❌ POST Instagram not connected check failed:', {
        userExists: !!user,
        instagramDataExists: !!user?.instagramData,
        isConnected: user?.instagramData?.isConnected
      });
      return Response.json(
        { error: 'Instagram account not connected' },
        { status: 400 }
      );
    }
    
    // Check if we have recent analytics (within last hour) and not forcing refresh
    const lastUpdate = user.instagramData.lastAnalyticsUpdate;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    if (!forceRefresh && lastUpdate && new Date(lastUpdate) > oneHourAgo) {
      return Response.json({
        success: true,
        analytics: user.instagramData.latestAnalytics,
        fromCache: true,
        accountInfo: {
          accountId: user.instagramData.accountId,
          username: user.instagramData.username,
          isConnected: true
        }
      });
    }
    
    const accessToken = user.instagramData.pageAccessToken;
    const accountId = user.instagramData.accountId;
    
    // Verify token is still valid
    const isTokenValid = await verifyMetaToken(accessToken);
    
    if (!isTokenValid) {
      return Response.json(
        { error: 'Instagram token expired. Please reconnect your account.' },
        { status: 401 }
      );
    }
    
    // Fetch fresh analytics data
    const analytics = await getInstagramAnalytics(accessToken, accountId);
    
    // Get current account info
    const accountInfo = await getInstagramAccountInfo(user.instagramData.accessToken);
    analytics.accountMetrics = {
      followersCount: accountInfo.followersCount,
      mediaCount: accountInfo.mediaCount,
      username: accountInfo.username,
      name: accountInfo.name
    };
    
    // Update user with fresh analytics
    await User.findByIdAndUpdate(userId, {
      $set: {
        'instagramData.lastAnalyticsUpdate': new Date(),
        'instagramData.latestAnalytics': analytics,
        'instagramData.followersCount': accountInfo.followersCount,
        'instagramData.mediaCount': accountInfo.mediaCount
      }
    });
    
    return Response.json({
      success: true,
      analytics,
      fromCache: false,
      accountInfo: {
        accountId: user.instagramData.accountId,
        username: accountInfo.username,
        isConnected: true
      }
    });
    
  } catch (error) {
    console.error('Instagram analytics POST error:', error);
    return Response.json(
      { error: 'Failed to update Instagram analytics data' },
      { status: 500 }
    );
  }
}