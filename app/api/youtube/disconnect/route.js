import connectDB from '../../../../lib/mongodb.js';
import { User } from '../../../../models/User.js';
import { SocialMediaAccount } from '../../../../models/SocialMediaAccount.js';
import { SocialMediaType } from '../../../../models/SocialMediaType.js';

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
    
    // Delete SocialMediaAccount record
    const youtubeType = await SocialMediaType.findOne({ SMType_Description: 'YouTube' });
    
    if (youtubeType) {
      const deletedAccount = await SocialMediaAccount.findOneAndDelete({
        user_id: userId,
        SMType_ID: youtubeType._id
      });
      
      if (deletedAccount) {
        console.log('✅ YouTube SocialMediaAccount deleted for user:', userId);
      }
    }
    
    // Update user to disconnect YouTube
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $unset: {
          'youtubeData.accessToken': '',
          'youtubeData.refreshToken': '',
          'youtubeData.channelId': '',
          'youtubeData.channelTitle': '',
          'youtubeData.subscriberCount': '',
          'youtubeData.videoCount': '',
          'youtubeData.viewCount': '',
          'youtubeData.thumbnails': '',
          'youtubeData.lastSynced': ''
        },
        $set: {
          'youtubeData.isConnected': false
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
      message: 'YouTube account disconnected successfully'
    });
    
  } catch (error) {
    console.error('YouTube disconnect error:', error);
    return Response.json(
      { error: 'Failed to disconnect YouTube account' },
      { status: 500 }
    );
  }
}
