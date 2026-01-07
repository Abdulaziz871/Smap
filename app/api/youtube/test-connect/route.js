import connectDB from '../../../../lib/mongodb.js';
import { User } from '../../../../models/User.js';

// Temporary mock YouTube data for testing without real OAuth
const MOCK_YOUTUBE_DATA = {
  channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
  channelTitle: 'Test YouTube Channel',
  subscriberCount: 1250,
  videoCount: 25,
  viewCount: 50000,
  thumbnails: {
    default: {
      url: 'https://via.placeholder.com/88x88/ff0000/ffffff?text=YT'
    }
  }
};

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
    
    // For testing: simulate YouTube connection with mock data
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          'youtubeData.channelId': MOCK_YOUTUBE_DATA.channelId,
          'youtubeData.channelTitle': MOCK_YOUTUBE_DATA.channelTitle,
          'youtubeData.subscriberCount': MOCK_YOUTUBE_DATA.subscriberCount,
          'youtubeData.videoCount': MOCK_YOUTUBE_DATA.videoCount,
          'youtubeData.viewCount': MOCK_YOUTUBE_DATA.viewCount,
          'youtubeData.thumbnails': MOCK_YOUTUBE_DATA.thumbnails,
          'youtubeData.isConnected': true,
          'youtubeData.lastSynced': new Date(),
          'youtubeData.accessToken': 'mock_access_token',
          'youtubeData.refreshToken': 'mock_refresh_token'
        }
      },
      { new: true }
    );
    
    if (!user) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return Response.json({
      message: 'YouTube account connected successfully (Test Mode)',
      youtubeData: {
        channelId: MOCK_YOUTUBE_DATA.channelId,
        channelTitle: MOCK_YOUTUBE_DATA.channelTitle,
        subscriberCount: MOCK_YOUTUBE_DATA.subscriberCount,
        videoCount: MOCK_YOUTUBE_DATA.videoCount,
        viewCount: MOCK_YOUTUBE_DATA.viewCount,
        thumbnails: MOCK_YOUTUBE_DATA.thumbnails,
        lastSynced: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('YouTube test connect error:', error);
    return Response.json(
      { error: 'Failed to connect YouTube account (test mode)' },
      { status: 500 }
    );
  }
}
