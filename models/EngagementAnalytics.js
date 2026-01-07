import mongoose from 'mongoose';

// Engagement Analytics Schema
const engagementAnalyticsSchema = new mongoose.Schema({
  account_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SocialMediaAccount',
    required: true
  },
  engagement_rate: {
    type: Number,
    required: true,
    default: 0
  },
  average_like_rate: {
    type: Number,
    default: 0
  },
  average_comment_rate: {
    type: Number,
    default: 0
  },
  average_share_rate: {
    type: Number,
    default: 0
  },
  total_likes: {
    type: Number,
    default: 0
  },
  total_comments: {
    type: Number,
    default: 0
  },
  total_shares: {
    type: Number,
    default: 0
  },
  reach: {
    type: Number,
    default: 0
  },
  impressions: {
    type: Number,
    default: 0
  },
  best_posting_times: {
    type: [String],
    default: []
  },
  top_hashtags: {
    type: [String],
    default: []
  },
  recorded_at: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient time-based queries
engagementAnalyticsSchema.index({ account_id: 1, recorded_at: -1 });

export const EngagementAnalytics = mongoose.models.EngagementAnalytics || mongoose.model('EngagementAnalytics', engagementAnalyticsSchema);
