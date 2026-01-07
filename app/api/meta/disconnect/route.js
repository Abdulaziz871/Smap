import connectDB from '@/lib/mongodb.js';
import { User } from '@/models/User.js';
import { SocialMediaAccount } from '@/models/SocialMediaAccount.js';
import { SocialMediaType } from '@/models/SocialMediaType.js';

export async function POST(request) {
  try {
    await connectDB();
    
    const { userId, platform } = await request.json();
    
    if (!userId || !platform) {
      return Response.json(
        { error: 'User ID and platform are required' },
        { status: 400 }
      );
    }
    
    let updateData = {};
    let platformName = '';
    
    if (platform === 'instagram') {
      updateData = {
        $unset: {
          'instagramData': 1
        }
      };
      platformName = 'Instagram';
    } else if (platform === 'facebook') {
      updateData = {
        $unset: {
          'facebookData': 1
        }
      };
      platformName = 'Facebook';
    } else {
      return Response.json(
        { error: 'Invalid platform. Must be instagram or facebook' },
        { status: 400 }
      );
    }
    
    // Update user to remove platform data
    await User.findByIdAndUpdate(userId, updateData);
    
    // Also delete the SocialMediaAccount record
    const smType = await SocialMediaType.findOne({ SMType_Description: platformName });
    if (smType) {
      const deletedAccount = await SocialMediaAccount.findOneAndDelete({
        user_id: userId,
        SMType_ID: smType._id
      });
      
      if (deletedAccount) {
        console.log(`🗑️ Deleted SocialMediaAccount record for ${platformName}`);
      }
    }
    
    console.log(`✅ ${platform} account disconnected successfully for user:`, userId);
    
    return Response.json({
      success: true,
      message: `${platform} account disconnected successfully`,
      platform
    });
    
  } catch (error) {
    console.error('Meta disconnect error:', error);
    return Response.json(
      { error: 'Failed to disconnect account' },
      { status: 500 }
    );
  }
}