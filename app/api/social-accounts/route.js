import connectDB from '../../../lib/mongodb.js';
import { SocialMediaAccount } from '../../../models/SocialMediaAccount.js';
import { SocialMediaType } from '../../../models/SocialMediaType.js';

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

    // Get all connected accounts for the user
    const accounts = await SocialMediaAccount.find({ user_id: userId })
      .populate('SMType_ID', 'SMType_Description iconUrl')
      .sort({ connected_at: -1 });

    return Response.json({ accounts }, { status: 200 });

  } catch (error) {
    console.error('Error fetching social media accounts:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    
    const { userId, smTypeId, username, accessToken, refreshToken } = await request.json();

    // Validate input
    if (!userId || !smTypeId || !username || !accessToken) {
      return Response.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check if account already exists
    const existingAccount = await SocialMediaAccount.findOne({
      user_id: userId,
      SMType_ID: smTypeId
    });

    if (existingAccount) {
      return Response.json(
        { error: 'Account already connected' },
        { status: 409 }
      );
    }

    // Create new social media account
    const account = await SocialMediaAccount.create({
      user_id: userId,
      SMType_ID: smTypeId,
      username,
      access_token: accessToken,
      refresh_token: refreshToken || null,
      connected_at: new Date(),
      last_sync_at: new Date()
    });

    const populatedAccount = await SocialMediaAccount.findById(account._id)
      .populate('SMType_ID', 'SMType_Description iconUrl');

    return Response.json(
      { 
        message: 'Social media account connected successfully',
        account: populatedAccount
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error connecting social media account:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
