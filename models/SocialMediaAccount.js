import mongoose from 'mongoose';

// Social Media Account Schema
const socialMediaAccountSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  SMType_ID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SocialMediaType',
    required: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  access_token: {
    type: String,
    required: true
  },
  refresh_token: {
    type: String,
    default: null
  },
  token_expires_at: {
    type: Date,
    default: null
  },
  connected_at: {
    type: Date,
    default: Date.now
  },
  last_sync_at: {
    type: Date,
    default: null
  },
  is_active: {
    type: Boolean,
    default: true
  },
  account_data: {
    type: Object,
    default: {}
  }
});

// Compound index for user and social media type
socialMediaAccountSchema.index({ user_id: 1, SMType_ID: 1 }, { unique: true });

export const SocialMediaAccount = mongoose.models.SocialMediaAccount || mongoose.model('SocialMediaAccount', socialMediaAccountSchema);
