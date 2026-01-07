import mongoose from 'mongoose';

// Post Analytics Schema
const postAnalyticsSchema = new mongoose.Schema({
  account_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SocialMediaAccount',
    required: true
  },
  post_id: {
    type: String,
    required: true
  },
  post_count: {
    type: Number,
    default: 0
  },
  post_views: {
    type: Number,
    default: 0
  },
  post_content: {
    type: String,
    default: null
  },
  post_likes: {
    type: Number,
    default: 0
  },
  shares_count: {
    type: Number,
    default: 0
  },
  comments_count: {
    type: Number,
    default: 0
  },
  engagement_rate: {
    type: Number,
    default: 0
  },
  post_type: {
    type: String,
    enum: ['photo', 'video', 'carousel', 'story', 'reel', 'text'],
    default: 'photo'
  },
  post_url: {
    type: String,
    default: null
  },
  recorded_at: {
    type: Date,
    default: Date.now
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Compound index for account and post
postAnalyticsSchema.index({ account_id: 1, post_id: 1 }, { unique: true });

export const PostAnalytics = mongoose.models.PostAnalytics || mongoose.model('PostAnalytics', postAnalyticsSchema);
