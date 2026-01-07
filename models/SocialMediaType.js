import mongoose from 'mongoose';

// Social Media Type Schema
const socialMediaTypeSchema = new mongoose.Schema({
  SMType_Description: {
    type: String,
    required: true,
    enum: ['Instagram', 'Facebook', 'YouTube', 'Twitter', 'TikTok', 'LinkedIn']
  },
  apiEndpoint: {
    type: String,
    required: true
  },
  iconUrl: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

export const SocialMediaType = mongoose.models.SocialMediaType || mongoose.model('SocialMediaType', socialMediaTypeSchema);
