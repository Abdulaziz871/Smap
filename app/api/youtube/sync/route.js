import connectDB from '../../../../lib/mongodb.js';
import { User } from '../../../../models/User.js';
import { getYouTubeChannelInfo, getYouTubeVideos, refreshYouTubeToken, verifyYouTubeToken } from '../../../../utils/youtube.js';

export async function POST(request) {
  try {
    await connectDB();
    
    const { userId } = await request.json();
    
    if (!userId) {
      return Response.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Get user with YouTube data
    const user = await User.findById(userId);
    
    if (!user || !user.youtubeData || !user.youtubeData.isConnected) {
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
    
    try {
      // Get updated channel information
      const channelInfo = await getYouTubeChannelInfo(accessToken);
      
      // Get recent videos
      const recentVideos = await getYouTubeVideos(accessToken, 10);
      
      console.log('🎬 YouTube Sync Debug:', {
        channelId: channelInfo.channelId,
        videosFound: recentVideos.length,
        videoSample: recentVideos.slice(0, 2).map(v => ({ 
          title: v.title, 
          views: v.viewCount,
          id: v.videoId 
        }))
      });
      
      // Update user with latest data
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            'youtubeData.channelTitle': channelInfo.title,
            'youtubeData.subscriberCount': channelInfo.subscriberCount,
            'youtubeData.videoCount': channelInfo.videoCount,
            'youtubeData.viewCount': channelInfo.viewCount,
            'youtubeData.thumbnails': channelInfo.thumbnails,
            'youtubeData.videos': recentVideos, // Store the videos!
            'youtubeData.lastSynced': new Date()
          }
        },
        { new: true, select: 'youtubeData' }
      );
      
      return Response.json({
        message: 'YouTube data synced successfully',
        channelInfo,
        recentVideos,
        syncTime: new Date().toISOString(),
        youtubeData: updatedUser.youtubeData
      });
      
    } catch (syncError) {
      console.error('YouTube sync error:', syncError);
      return Response.json(
        { error: 'Failed to sync YouTube data' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('YouTube sync error:', error);
    return Response.json(
      { error: 'Failed to sync YouTube data' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return Response.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Get user's YouTube data
    const user = await User.findById(userId, 'youtubeData');
    
    if (!user) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    if (!user.youtubeData || !user.youtubeData.isConnected) {
      return Response.json({
        isConnected: false,
        message: 'YouTube account not connected'
      });
    }
    
    return Response.json({
      isConnected: true,
      youtubeData: {
        channelId: user.youtubeData.channelId,
        channelTitle: user.youtubeData.channelTitle,
        subscriberCount: user.youtubeData.subscriberCount,
        videoCount: user.youtubeData.videoCount,
        viewCount: user.youtubeData.viewCount,
        thumbnails: user.youtubeData.thumbnails,
        lastSynced: user.youtubeData.lastSynced
      }
    });
    
  } catch (error) {
    console.error('Get YouTube data error:', error);
    return Response.json(
      { error: 'Failed to get YouTube data' },
      { status: 500 }
    );
  }
}
