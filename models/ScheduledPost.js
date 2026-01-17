import mongoose from 'mongoose';

const scheduledPostSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  platform: {
    type: String,
    enum: ['facebook', 'instagram', 'youtube', 'tiktok'],
    required: true,
  },
  // Facebook-specific fields
  pageId: {
    type: String,
    required: function() {
      return this.platform === 'facebook';
    },
  },
  pageName: {
    type: String,
  },
  // Post content
  content: {
    message: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    link: {
      type: String,
    },
    mediaUrls: [{
      type: String,
    }],
    mediaType: {
      type: String,
      enum: ['none', 'image', 'video', 'link'],
      default: 'none',
    },
  },
  // Scheduling
  scheduledTime: {
    type: Date,
    required: true,
    index: true,
  },
  timezone: {
    type: String,
    default: 'UTC',
  },
  // Status tracking
  status: {
    type: String,
    enum: ['scheduled', 'publishing', 'published', 'failed', 'cancelled'],
    default: 'scheduled',
    index: true,
  },
  // Result tracking
  publishedAt: {
    type: Date,
  },
  publishedPostId: {
    type: String,
  },
  publishedPostUrl: {
    type: String,
  },
  errorMessage: {
    type: String,
  },
  retryCount: {
    type: Number,
    default: 0,
  },
  maxRetries: {
    type: Number,
    default: 3,
  },
  // AI-generated content flag
  aiGenerated: {
    type: Boolean,
    default: false,
  },
  aiPrompt: {
    type: String,
  },
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp on save
scheduledPostSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for finding posts ready to publish
scheduledPostSchema.index({ status: 1, scheduledTime: 1 });

// Static method to find posts ready to publish
scheduledPostSchema.statics.findReadyToPublish = function() {
  return this.find({
    status: 'scheduled',
    scheduledTime: { $lte: new Date() },
  }).populate('userId');
};

// Static method to find user's scheduled posts
scheduledPostSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.platform) {
    query.platform = options.platform;
  }
  
  return this.find(query).sort({ scheduledTime: options.ascending ? 1 : -1 });
};

// Instance method to mark as published
scheduledPostSchema.methods.markAsPublished = function(postId, postUrl) {
  this.status = 'published';
  this.publishedAt = new Date();
  this.publishedPostId = postId;
  this.publishedPostUrl = postUrl;
  return this.save();
};

// Instance method to mark as failed
scheduledPostSchema.methods.markAsFailed = function(errorMessage) {
  this.retryCount += 1;
  
  if (this.retryCount >= this.maxRetries) {
    this.status = 'failed';
  }
  
  this.errorMessage = errorMessage;
  return this.save();
};

// Instance method to cancel
scheduledPostSchema.methods.cancel = function() {
  if (this.status === 'scheduled') {
    this.status = 'cancelled';
    return this.save();
  }
  throw new Error('Can only cancel scheduled posts');
};

const ScheduledPost = mongoose.models.ScheduledPost || mongoose.model('ScheduledPost', scheduledPostSchema);

export default ScheduledPost;
