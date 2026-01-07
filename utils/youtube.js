import { google } from 'googleapis';

// YouTube OAuth2 configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI
);

// Required scopes for YouTube API
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/userinfo.profile'
];

/**
 * Generate YouTube OAuth authorization URL
 */
export function getYouTubeAuthUrl(state) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: state, // Can include user ID or session info
    prompt: 'consent', // Force consent screen to get refresh token
  });
  
  return authUrl;
}

/**
 * Exchange authorization code for access tokens
 */
export async function getYouTubeTokens(code) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    console.error('Error getting YouTube tokens:', error);
    throw error;
  }
}

/**
 * Get YouTube channel information
 */
export async function getYouTubeChannelInfo(accessToken) {
  try {
    // Set the access token
    oauth2Client.setCredentials({ access_token: accessToken });
    
    // Create YouTube API client
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    
    // Get channel information
    const channelResponse = await youtube.channels.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      mine: true
    });
    
    if (channelResponse.data.items && channelResponse.data.items.length > 0) {
      const channel = channelResponse.data.items[0];
      return {
        channelId: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description,
        thumbnails: channel.snippet.thumbnails,
        subscriberCount: parseInt(channel.statistics.subscriberCount) || 0,
        videoCount: parseInt(channel.statistics.videoCount) || 0,
        viewCount: parseInt(channel.statistics.viewCount) || 0,
        uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads,
        publishedAt: channel.snippet.publishedAt
      };
    }
    
    // Return default channel info for accounts without a YouTube channel
    return {
      channelId: 'no-channel',
      title: 'No YouTube Channel',
      description: 'This Google account does not have a YouTube channel yet.',
      thumbnails: { default: { url: '' } },
      subscriberCount: 0,
      videoCount: 0,
      viewCount: 0,
      uploadsPlaylistId: null,
      publishedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting YouTube channel info:', error);
    throw error;
  }
}

/**
 * Get recent videos from channel
 */
export async function getYouTubeVideos(accessToken, maxResults = 10) {
  try {
    oauth2Client.setCredentials({ access_token: accessToken });
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    
    // First get the channel to find uploads playlist
    const channelInfo = await getYouTubeChannelInfo(accessToken);
    
    // Get videos from uploads playlist
    const videosResponse = await youtube.playlistItems.list({
      part: ['snippet'],
      playlistId: channelInfo.uploadsPlaylistId,
      maxResults: maxResults
    });
    
    if (videosResponse.data.items) {
      // Get detailed statistics for each video
      const videoIds = videosResponse.data.items.map(item => item.snippet.resourceId.videoId);
      
      const statsResponse = await youtube.videos.list({
        part: ['statistics', 'snippet'],
        id: videoIds.join(',')
      });
      
      return statsResponse.data.items.map(video => ({
        videoId: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnails: video.snippet.thumbnails,
        publishedAt: video.snippet.publishedAt,
        viewCount: parseInt(video.statistics.viewCount) || 0,
        likeCount: parseInt(video.statistics.likeCount) || 0,
        commentCount: parseInt(video.statistics.commentCount) || 0
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error getting YouTube videos:', error);
    throw error;
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshYouTubeToken(refreshToken) {
  try {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  } catch (error) {
    console.error('Error refreshing YouTube token:', error);
    throw error;
  }
}

/**
 * Verify if access token is still valid
 */
export async function verifyYouTubeToken(accessToken) {
  try {
    oauth2Client.setCredentials({ access_token: accessToken });
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    
    // Try to make a simple API call to verify token
    await youtube.channels.list({
      part: ['snippet'],
      mine: true,
      maxResults: 1
    });
    
    return true;
  } catch (error) {
    console.error('YouTube token verification failed:', error);
    return false;
  }
}

/**
 * Get detailed YouTube Analytics data
 */
export async function getYouTubeAnalytics(accessToken, channelId, startDate = null, endDate = null) {
  try {
    oauth2Client.setCredentials({ access_token: accessToken });
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    
    // Default to last 30 days
    if (!startDate) {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      startDate = date.toISOString().split('T')[0];
    }
    if (!endDate) {
      endDate = new Date().toISOString().split('T')[0];
    }

    // Get channel statistics over time
    const analytics = {
      dateRange: { startDate, endDate },
      channelMetrics: {},
      recentVideos: [],
      topVideos: [],
      engagement: {}
    };

    // Get recent videos with detailed stats (fetch all videos)
    try {
      analytics.recentVideos = await getYouTubeVideos(accessToken, 50);
      console.log(`📊 Fetched ${analytics.recentVideos.length} videos from YouTube`);
    } catch (error) {
      console.log('Could not fetch recent videos:', error.message);
      analytics.recentVideos = [];
    }

    // Get top performing videos (by views)
    try {
      const allVideos = await getYouTubeVideos(accessToken, 50);
      analytics.topVideos = allVideos
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, 10); // Show top 10 instead of 5
      console.log(`🏆 Top ${analytics.topVideos.length} performing videos selected`);
    } catch (error) {
      console.log('Could not fetch top videos:', error.message);
      analytics.topVideos = [];
    }

    // Calculate engagement metrics
    if (analytics.recentVideos.length > 0) {
      const totalViews = analytics.recentVideos.reduce((sum, video) => sum + video.viewCount, 0);
      const totalLikes = analytics.recentVideos.reduce((sum, video) => sum + video.likeCount, 0);
      const totalComments = analytics.recentVideos.reduce((sum, video) => sum + video.commentCount, 0);
      
      analytics.engagement = {
        averageViews: Math.round(totalViews / analytics.recentVideos.length),
        averageLikes: Math.round(totalLikes / analytics.recentVideos.length),
        averageComments: Math.round(totalComments / analytics.recentVideos.length),
        engagementRate: totalViews > 0 ? ((totalLikes + totalComments) / totalViews * 100).toFixed(2) : 0
      };
    }

    // Get current channel metrics
    const channelInfo = await getYouTubeChannelInfo(accessToken);
    analytics.channelMetrics = {
      subscriberCount: channelInfo.subscriberCount,
      totalVideoCount: channelInfo.videoCount,
      totalViewCount: channelInfo.viewCount,
      channelTitle: channelInfo.title,
      channelId: channelInfo.channelId
    };

    return analytics;
  } catch (error) {
    console.error('Error getting YouTube analytics:', error);
    throw error;
  }
}

/**
 * Get simplified analytics for dashboard
 */
export async function getYouTubeSimpleAnalytics(accessToken) {
  try {
    const channelInfo = await getYouTubeChannelInfo(accessToken);
    const recentVideos = await getYouTubeVideos(accessToken, 5);
    
    return {
      channelInfo,
      recentVideos,
      summary: {
        totalSubscribers: channelInfo.subscriberCount,
        totalVideos: channelInfo.videoCount,
        totalViews: channelInfo.viewCount,
        recentVideoCount: recentVideos.length
      }
    };
  } catch (error) {
    console.error('Error getting simple YouTube analytics:', error);
    throw error;
  }
}
