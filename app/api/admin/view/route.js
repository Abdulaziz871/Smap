import connectDB from '../../../../lib/mongodb.js';
import { User } from '../../../../models/User.js';
import { SocialMediaAccount } from '../../../../models/SocialMediaAccount.js';
import { SocialMediaType } from '../../../../models/SocialMediaType.js';
import { FollowerAnalytics } from '../../../../models/FollowerAnalytics.js';
import { EngagementAnalytics } from '../../../../models/EngagementAnalytics.js';
import { PostAnalytics } from '../../../../models/PostAnalytics.js';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const collection = searchParams.get('collection') || 'users';
    const limit = parseInt(searchParams.get('limit')) || 10;
    
    let data = [];
    let count = 0;
    
    switch (collection) {
      case 'users':
        data = await User.find({}, { password: 0 }).limit(limit).sort({ createdAt: -1 });
        count = await User.countDocuments();
        break;
        
      case 'socialMediaTypes':
        data = await SocialMediaType.find({}).limit(limit);
        count = await SocialMediaType.countDocuments();
        break;
        
      case 'socialMediaAccounts':
        data = await SocialMediaAccount.find({})
          .populate('user_id', 'userName email')
          .populate('SMType_ID', 'SMType_Description')
          .limit(limit)
          .sort({ connected_at: -1 });
        count = await SocialMediaAccount.countDocuments();
        break;
        
      case 'followerAnalytics':
        data = await FollowerAnalytics.find({})
          .populate('account_id', 'username')
          .limit(limit)
          .sort({ recorded_at: -1 });
        count = await FollowerAnalytics.countDocuments();
        break;
        
      case 'engagementAnalytics':
        data = await EngagementAnalytics.find({})
          .populate('account_id', 'username')
          .limit(limit)
          .sort({ recorded_at: -1 });
        count = await EngagementAnalytics.countDocuments();
        break;
        
      case 'postAnalytics':
        data = await PostAnalytics.find({})
          .populate('account_id', 'username')
          .limit(limit)
          .sort({ recorded_at: -1 });
        count = await PostAnalytics.countDocuments();
        break;
        
      default:
        return Response.json({ error: 'Invalid collection' }, { status: 400 });
    }
    
    return Response.json({
      collection,
      data,
      count,
      limit,
      message: `Retrieved ${data.length} records from ${collection}`
    });
    
  } catch (error) {
    console.error('Database view error:', error);
    return Response.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
