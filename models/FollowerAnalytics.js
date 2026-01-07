import mongoose from 'mongoose';

// Follower Analytics Schema
const followerAnalyticsSchema = new mongoose.Schema({
  account_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SocialMediaAccount',
    required: true
  },
  follower_count: {
    type: Number,
    required: true,
    default: 0
  },
  following_count: {
    type: Number,
    default: 0
  },
  new_followers: {
    type: Number,
    default: 0
  },
  unfollowers: {
    type: Number,
    default: 0
  },
  follower_growth_rate: {
    type: Number,
    default: 0
  },
  demographics: {
    age_groups: {
      type: Object,
      default: {}
    },
    gender_distribution: {
      type: Object,
      default: {}
    },
    location_data: {
      type: Object,
      default: {}
    }
  },
  recorded_at: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient time-based queries
followerAnalyticsSchema.index({ account_id: 1, recorded_at: -1 });

export const FollowerAnalytics = mongoose.models.FollowerAnalytics || mongoose.model('FollowerAnalytics', followerAnalyticsSchema);
