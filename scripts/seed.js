import connectDB from '../lib/mongodb.js';
import { User } from '../models/User.js';
import { SocialMediaAccount } from '../models/SocialMediaAccount.js';
import { SocialMediaType } from '../models/SocialMediaType.js';
import { FollowerAnalytics } from '../models/FollowerAnalytics.js';
import { EngagementAnalytics } from '../models/EngagementAnalytics.js';
import { PostAnalytics } from '../models/PostAnalytics.js';
import bcrypt from 'bcryptjs';

export async function seedDatabase() {
  try {
    await connectDB();
    console.log('🌱 Starting database seeding...');

    // Create test user
    const existingUser = await User.findOne({ email: 'test@smap.com' });
    let testUser;
    
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('password123', 12);
      testUser = await User.create({
        userName: 'testuser',
        email: 'test@smap.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe'
      });
      console.log('✅ Created test user');
    } else {
      testUser = existingUser;
      console.log('✅ Test user already exists');
    }

    // Get Instagram social media type
    const instagramType = await SocialMediaType.findOne({ SMType_Description: 'Instagram' });
    if (!instagramType) {
      console.log('❌ Instagram social media type not found');
      return;
    }

    // Create test social media account
    const existingAccount = await SocialMediaAccount.findOne({
      user_id: testUser._id,
      SMType_ID: instagramType._id
    });

    let testAccount;
    if (!existingAccount) {
      testAccount = await SocialMediaAccount.create({
        user_id: testUser._id,
        SMType_ID: instagramType._id,
        username: 'test_instagram',
        access_token: 'test_token_123',
        connected_at: new Date(),
        last_sync_at: new Date()
      });
      console.log('✅ Created test social media account');
    } else {
      testAccount = existingAccount;
      console.log('✅ Test social media account already exists');
    }

    // Generate sample follower analytics for the last 30 days
    const followerAnalyticsExists = await FollowerAnalytics.findOne({ account_id: testAccount._id });
    if (!followerAnalyticsExists) {
      const followerAnalytics = [];
      for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const baseFollowers = 45000;
        const growth = Math.floor(Math.random() * 200) - 50; // Random growth between -50 and +150
        
        followerAnalytics.push({
          account_id: testAccount._id,
          follower_count: baseFollowers + (growth * (30 - i)),
          following_count: 150,
          new_followers: Math.max(0, growth),
          unfollowers: Math.max(0, -growth),
          follower_growth_rate: (growth / baseFollowers) * 100,
          recorded_at: date
        });
      }
      
      await FollowerAnalytics.insertMany(followerAnalytics);
      console.log('✅ Created follower analytics data');
    }

    // Generate sample engagement analytics
    const engagementAnalyticsExists = await EngagementAnalytics.findOne({ account_id: testAccount._id });
    if (!engagementAnalyticsExists) {
      const engagementAnalytics = [];
      for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const engagementRate = 3.5 + (Math.random() * 4); // Between 3.5% and 7.5%
        
        engagementAnalytics.push({
          account_id: testAccount._id,
          engagement_rate: engagementRate,
          average_like_rate: engagementRate * 0.8,
          average_comment_rate: engagementRate * 0.15,
          average_share_rate: engagementRate * 0.05,
          total_likes: Math.floor(Math.random() * 1000) + 500,
          total_comments: Math.floor(Math.random() * 100) + 20,
          total_shares: Math.floor(Math.random() * 50) + 5,
          reach: Math.floor(Math.random() * 10000) + 5000,
          impressions: Math.floor(Math.random() * 15000) + 8000,
          recorded_at: date
        });
      }
      
      await EngagementAnalytics.insertMany(engagementAnalytics);
      console.log('✅ Created engagement analytics data');
    }

    // Generate sample post analytics
    const postAnalyticsExists = await PostAnalytics.findOne({ account_id: testAccount._id });
    if (!postAnalyticsExists) {
      const postAnalytics = [];
      const postTypes = ['photo', 'video', 'carousel', 'reel'];
      
      for (let i = 0; i < 20; i++) {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        
        const likes = Math.floor(Math.random() * 2000) + 300;
        const comments = Math.floor(Math.random() * 100) + 10;
        const shares = Math.floor(Math.random() * 50) + 5;
        const views = Math.floor(Math.random() * 5000) + 1000;
        
        postAnalytics.push({
          account_id: testAccount._id,
          post_id: `post_${i + 1}`,
          post_content: `Sample post content ${i + 1}`,
          post_likes: likes,
          comments_count: comments,
          shares_count: shares,
          post_views: views,
          engagement_rate: ((likes + comments + shares) / views) * 100,
          post_type: postTypes[Math.floor(Math.random() * postTypes.length)],
          post_url: `https://instagram.com/p/sample_${i + 1}`,
          recorded_at: date
        });
      }
      
      await PostAnalytics.insertMany(postAnalytics);
      console.log('✅ Created post analytics data');
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('📧 Test user email: test@smap.com');
    console.log('🔑 Test user password: password123');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
}

// Run seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().then(() => {
    console.log('Seeding completed');
    process.exit(0);
  }).catch(error => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
}
