import connectDB from '@/lib/mongodb.js';
import { User } from '@/models/User.js';
import { getFacebookAnalytics, verifyMetaToken, getFacebookPageInfo } from '@/utils/meta.js';

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
    
    // Get user with Facebook data
    const user = await User.findById(userId);
    console.log('🔍 GET User lookup for Facebook analytics:', {
      userId,
      userFound: !!user,
      hasFacebookData: !!user?.facebookData,
      isConnected: user?.facebookData?.isConnected,
      hasAccessToken: !!user?.facebookData?.pageAccessToken
    });
    
    if (!user || !user.facebookData || !user.facebookData.isConnected) {
      console.log('❌ GET Facebook not connected check failed:', {
        userExists: !!user,
        facebookDataExists: !!user?.facebookData,
        isConnected: user?.facebookData?.isConnected
      });
      return Response.json(
        { error: 'Facebook page not connected' },
        { status: 400 }
      );
    }
    
    const pageAccessToken = user.facebookData.pageAccessToken;
    const pageId = user.facebookData.pageId;
    
    // Verify if current token is still valid
    const isTokenValid = await verifyMetaToken(pageAccessToken);
    
    if (!isTokenValid) {
      return Response.json(
        { error: 'Facebook token expired. Please reconnect your account.' },
        { status: 401 }
      );
    }
    
    // Get analytics data with date range
    const analytics = await getFacebookAnalytics(
      pageAccessToken,
      pageId,
      startDate,
      endDate
    );
    
    // Get current page info
    const pageInfo = await getFacebookPageInfo(pageAccessToken, pageId);
    analytics.pageMetrics = {
      fanCount: pageInfo.fanCount,
      talkingAboutCount: pageInfo.talkingAboutCount,
      name: pageInfo.name,
      category: pageInfo.category
    };
    
    // Add posts as an alias for recentPosts for easier access
    analytics.posts = analytics.recentPosts || [];
    
    // Store analytics in database for historical tracking
    await User.findByIdAndUpdate(userId, {
      $set: {
        'facebookData.lastAnalyticsUpdate': new Date(),
        'facebookData.latestAnalytics': analytics
      }
    });
    
    return Response.json({
      success: true,
      analytics,
      pageInfo: {
        pageId: user.facebookData.pageId,
        pageName: pageInfo.name,
        isConnected: true
      }
    });
    
  } catch (error) {
    console.error('Facebook analytics API error:', error);
    return Response.json(
      { error: 'Failed to fetch Facebook analytics data' },
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
    
    // Get user with Facebook data
    const user = await User.findById(userId);
    console.log('🔍 POST User lookup for Facebook analytics:', {
      userId,
      userFound: !!user,
      hasFacebookData: !!user?.facebookData,
      isConnected: user?.facebookData?.isConnected,
      hasAccessToken: !!user?.facebookData?.pageAccessToken
    });
    
    if (!user || !user.facebookData || !user.facebookData.isConnected) {
      console.log('❌ POST Facebook not connected check failed:', {
        userExists: !!user,
        facebookDataExists: !!user?.facebookData,
        isConnected: user?.facebookData?.isConnected
      });
      return Response.json(
        { error: 'Facebook page not connected' },
        { status: 400 }
      );
    }
    
    // Check if we have recent analytics (within last hour) and not forcing refresh
    const lastUpdate = user.facebookData.lastAnalyticsUpdate;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    if (!forceRefresh && lastUpdate && new Date(lastUpdate) > oneHourAgo) {
      const cachedAnalytics = user.facebookData.latestAnalytics;
      // Add posts as an alias for recentPosts
      if (cachedAnalytics) {
        cachedAnalytics.posts = cachedAnalytics.recentPosts || [];
      }
      return Response.json({
        success: true,
        analytics: cachedAnalytics,
        fromCache: true,
        pageInfo: {
          pageId: user.facebookData.pageId,
          pageName: user.facebookData.pageName,
          isConnected: true
        }
      });
    }
    
    const pageAccessToken = user.facebookData.pageAccessToken;
    const pageId = user.facebookData.pageId;
    
    // Verify token is still valid
    const isTokenValid = await verifyMetaToken(pageAccessToken);
    
    if (!isTokenValid) {
      return Response.json(
        { error: 'Facebook token expired. Please reconnect your account.' },
        { status: 401 }
      );
    }
    
    // Fetch fresh analytics data
    const analytics = await getFacebookAnalytics(pageAccessToken, pageId);
    
    // Get current page info
    const pageInfo = await getFacebookPageInfo(pageAccessToken, pageId);
    analytics.pageMetrics = {
      fanCount: pageInfo.fanCount,
      talkingAboutCount: pageInfo.talkingAboutCount,
      name: pageInfo.name,
      category: pageInfo.category
    };
    
    // Add posts as an alias for recentPosts for easier access
    analytics.posts = analytics.recentPosts || [];
    
    // Update user with fresh analytics
    await User.findByIdAndUpdate(userId, {
      $set: {
        'facebookData.lastAnalyticsUpdate': new Date(),
        'facebookData.latestAnalytics': analytics,
        'facebookData.fanCount': pageInfo.fanCount,
        'facebookData.talkingAboutCount': pageInfo.talkingAboutCount
      }
    });
    
    return Response.json({
      success: true,
      analytics,
      fromCache: false,
      pageInfo: {
        pageId: user.facebookData.pageId,
        pageName: pageInfo.name,
        isConnected: true
      }
    });
    
  } catch (error) {
    console.error('Facebook analytics POST error:', error);
    return Response.json(
      { error: 'Failed to update Facebook analytics data' },
      { status: 500 }
    );
  }
}