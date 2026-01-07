import connectDB from '@/lib/mongodb.js';
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

    // Find the social media type
    const socialMediaType = await SocialMediaType.findOne({ 
      SMType_Description: platform.charAt(0).toUpperCase() + platform.slice(1) 
    });

    if (!socialMediaType) {
      return Response.json(
        { error: `${platform} social media type not found` },
        { status: 404 }
      );
    }

    // Check if account already exists
    const existingAccount = await SocialMediaAccount.findOne({
      user_id: userId,
      SMType_ID: socialMediaType._id
    });

    if (existingAccount) {
      return Response.json(
        { error: `${platform} account already connected` },
        { status: 409 }
      );
    }

    // Create demo account data
    const demoData = {
      instagram: {
        username: 'demo_instagram_user',
        access_token: 'demo_instagram_token_123',
        account_data: {
          id: 'demo_ig_123456',
          username: 'demo_instagram_user',
          account_type: 'PERSONAL',
          media_count: 150,
          followers_count: 1250,
          follows_count: 300
        }
      },
      facebook: {
        username: 'Demo Facebook Page',
        access_token: 'demo_facebook_token_123',
        account_data: {
          id: 'demo_fb_123456',
          name: 'Demo Facebook Page',
          category: 'Business',
          fan_count: 2500,
          talking_about_count: 125
        }
      }
    };

    const accountData = demoData[platform];
    
    // Create new demo social media account
    const account = await SocialMediaAccount.create({
      user_id: userId,
      SMType_ID: socialMediaType._id,
      username: accountData.username,
      access_token: accountData.access_token,
      connected_at: new Date(),
      last_sync_at: new Date(),
      account_data: accountData.account_data
    });

    const populatedAccount = await SocialMediaAccount.findById(account._id)
      .populate('SMType_ID', 'SMType_Description iconUrl');

    console.log(`✅ Demo ${platform} account created for user:`, userId);

    return Response.json({
      success: true,
      message: `Demo ${platform} account connected successfully! (This is test data)`,
      account: populatedAccount,
      platform,
      isDemo: true
    });

  } catch (error) {
    console.error('Demo account creation error:', error);
    return Response.json(
      { error: 'Failed to create demo account' },
      { status: 500 }
    );
  }
}