import connectDB from '../../../lib/mongodb.js';
import { FollowerAnalytics } from '../../../models/FollowerAnalytics.js';
import { EngagementAnalytics } from '../../../models/EngagementAnalytics.js';
import { PostAnalytics } from '../../../models/PostAnalytics.js';
import { SocialMediaAccount } from '../../../models/SocialMediaAccount.js';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const accountId = searchParams.get('accountId');
    const type = searchParams.get('type'); // 'followers', 'engagement', 'posts'
    const days = parseInt(searchParams.get('days')) || 30;

    if (!userId) {
      return Response.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user's social media accounts
    const accountFilter = { user_id: userId };
    if (accountId) {
      accountFilter._id = accountId;
    }
    
    const accounts = await SocialMediaAccount.find(accountFilter);
    const accountIds = accounts.map(acc => acc._id);

    // Calculate date range
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    let analytics = {};

    // Fetch follower analytics
    if (!type || type === 'followers') {
      const followerData = await FollowerAnalytics.find({
        account_id: { $in: accountIds },
        recorded_at: { $gte: fromDate }
      }).populate('account_id', 'username').sort({ recorded_at: -1 });

      analytics.followers = followerData;
    }

    // Fetch engagement analytics
    if (!type || type === 'engagement') {
      const engagementData = await EngagementAnalytics.find({
        account_id: { $in: accountIds },
        recorded_at: { $gte: fromDate }
      }).populate('account_id', 'username').sort({ recorded_at: -1 });

      analytics.engagement = engagementData;
    }

    // Fetch post analytics
    if (!type || type === 'posts') {
      const postData = await PostAnalytics.find({
        account_id: { $in: accountIds },
        recorded_at: { $gte: fromDate }
      }).populate('account_id', 'username').sort({ recorded_at: -1 });

      analytics.posts = postData;
    }

    // Calculate summary stats
    const summary = {
      totalFollowers: 0,
      totalEngagement: 0,
      totalPosts: 0,
      avgEngagementRate: 0,
      connectedAccounts: accounts.length
    };

    // Get latest follower counts
    for (const accountId of accountIds) {
      const latestFollower = await FollowerAnalytics.findOne({
        account_id: accountId
      }).sort({ recorded_at: -1 });

      if (latestFollower) {
        summary.totalFollowers += latestFollower.follower_count;
      }
    }

    // Get latest engagement data
    const latestEngagement = await EngagementAnalytics.find({
      account_id: { $in: accountIds }
    }).sort({ recorded_at: -1 }).limit(accountIds.length);

    if (latestEngagement.length > 0) {
      const totalEngagementRate = latestEngagement.reduce((sum, eng) => sum + eng.engagement_rate, 0);
      summary.avgEngagementRate = totalEngagementRate / latestEngagement.length;
    }

    // Get post count from last 30 days
    const postCount = await PostAnalytics.countDocuments({
      account_id: { $in: accountIds },
      recorded_at: { $gte: fromDate }
    });
    summary.totalPosts = postCount;

    return Response.json({ 
      analytics,
      summary,
      accounts
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
