import mongoose from 'mongoose';

// User Schema
const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  profilePicture: {
    type: String,
    default: null
  },
  // YouTube Integration
  youtubeData: {
    accessToken: String,
    refreshToken: String,
    channelId: String,
    channelTitle: String,
    subscriberCount: {
      type: Number,
      default: 0
    },
    videoCount: {
      type: Number,
      default: 0
    },
    viewCount: {
      type: Number,
      default: 0
    },
    thumbnails: {
      type: Object,
      default: null
    },
    videos: {
      type: Array,
      default: []
    },
    isConnected: {
      type: Boolean,
      default: false
    },
    lastSynced: {
      type: Date,
      default: null
    },
    lastAnalyticsUpdate: {
      type: Date,
      default: null
    },
    latestAnalytics: {
      type: Object,
      default: null
    }
  },
  // Instagram Integration
  instagramData: {
    accessToken: String,
    pageAccessToken: String,
    accountId: String,
    username: String,
    name: String,
    followersCount: {
      type: Number,
      default: 0
    },
    mediaCount: {
      type: Number,
      default: 0
    },
    pageId: String,
    isConnected: {
      type: Boolean,
      default: false
    },
    lastSynced: {
      type: Date,
      default: null
    },
    lastAnalyticsUpdate: {
      type: Date,
      default: null
    },
    latestAnalytics: {
      type: Object,
      default: null
    },
    connectedAt: {
      type: Date,
      default: null
    }
  },
  // Facebook Integration
  facebookData: {
    accessToken: String,
    pageAccessToken: String,
    pageId: String,
    pageName: String,
    fanCount: {
      type: Number,
      default: 0
    },
    talkingAboutCount: {
      type: Number,
      default: 0
    },
    category: String,
    isConnected: {
      type: Boolean,
      default: false
    },
    lastSynced: {
      type: Date,
      default: null
    },
    lastAnalyticsUpdate: {
      type: Date,
      default: null
    },
    latestAnalytics: {
      type: Object,
      default: null
    },
    connectedAt: {
      type: Date,
      default: null
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);
