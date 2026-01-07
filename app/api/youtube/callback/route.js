import connectDB from '../../../../lib/mongodb.js';
import { User } from '../../../../models/User.js';
import { SocialMediaAccount } from '../../../../models/SocialMediaAccount.js';
import { SocialMediaType } from '../../../../models/SocialMediaType.js';
import { getYouTubeTokens, getYouTubeChannelInfo } from '../../../../utils/youtube.js';

export async function GET(request) {
  try {
    await connectDB();
    
    const url = new URL(request.url);
    const { searchParams } = url;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Create base URL for redirects
    const baseUrl = `${url.protocol}//${url.host}`;
    
    // Handle user denial
    if (error === 'access_denied') {
      return Response.redirect(`${baseUrl}/connect?error=access_denied`);
    }
    
    if (!code || !state) {
      return Response.redirect(`${baseUrl}/connect?error=invalid_request`);
    }
    
    try {
      // Parse state to get user ID
      const { userId } = JSON.parse(state);
      
      if (!userId) {
        return Response.redirect(`${baseUrl}/connect?error=invalid_state`);
      }
      
      // Exchange authorization code for tokens
      const tokens = await getYouTubeTokens(code);
      
      if (!tokens.access_token) {
        throw new Error('Failed to get access token');
      }
      
      // Get YouTube channel information
      const channelInfo = await getYouTubeChannelInfo(tokens.access_token);
      
      // Update user with YouTube data
      const user = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            'youtubeData.accessToken': tokens.access_token,
            'youtubeData.refreshToken': tokens.refresh_token,
            'youtubeData.channelId': channelInfo.channelId,
            'youtubeData.channelTitle': channelInfo.title,
            'youtubeData.subscriberCount': channelInfo.subscriberCount,
            'youtubeData.videoCount': channelInfo.videoCount,
            'youtubeData.viewCount': channelInfo.viewCount,
            'youtubeData.thumbnails': channelInfo.thumbnails,
            'youtubeData.isConnected': true,
            'youtubeData.lastSynced': new Date()
          }
        },
        { new: true }
      );
      
      if (!user) {
        return Response.redirect(`${baseUrl}/connect?error=user_not_found`);
      }
      
      // Create or update SocialMediaAccount record
      const youtubeType = await SocialMediaType.findOne({ SMType_Description: 'YouTube' });
      
      if (youtubeType) {
        // Check if account already exists
        const existingAccount = await SocialMediaAccount.findOne({
          user_id: userId,
          SMType_ID: youtubeType._id
        });
        
        if (existingAccount) {
          // Update existing account
          await SocialMediaAccount.findByIdAndUpdate(existingAccount._id, {
            username: channelInfo.title,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            last_sync_at: new Date()
          });
          console.log('✅ YouTube SocialMediaAccount updated for user:', userId);
        } else {
          // Create new account
          await SocialMediaAccount.create({
            user_id: userId,
            SMType_ID: youtubeType._id,
            username: channelInfo.title,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            connected_at: new Date(),
            last_sync_at: new Date()
          });
          console.log('✅ YouTube SocialMediaAccount created for user:', userId);
        }
      }
      
      console.log('✅ YouTube connected successfully for user:', userId);
      
      // Redirect to connect page with success message
      return Response.redirect(`${baseUrl}/connect?success=youtube_connected`);
      
    } catch (parseError) {
      console.error('Error processing YouTube callback:', parseError);
      
      // Handle specific invalid_grant error
      if (parseError.message?.includes('invalid_grant')) {
        return Response.redirect(`${baseUrl}/connect?error=token_expired`);
      }
      
      return Response.redirect(`${baseUrl}/connect?error=processing_failed`);
    }
    
  } catch (error) {
    console.error('YouTube callback error:', error);
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    return Response.redirect(`${baseUrl}/connect?error=server_error`);
  }
}
