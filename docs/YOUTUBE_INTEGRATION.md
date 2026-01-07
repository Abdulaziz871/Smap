# YouTube API Integration for SMAP

## Overview
This document outlines the YouTube API integration for the SMAP (Social Media Analytics Platform). The integration allows users to securely connect their YouTube accounts and retrieve analytics data including channel information, subscriber counts, video statistics, and engagement metrics.

## Features Implemented

### 1. OAuth 2.0 Authentication Flow
- **Initiate Connection**: Users can connect their YouTube accounts via OAuth 2.0
- **Secure Authorization**: Uses Google OAuth with appropriate scopes
- **Token Management**: Automatically handles access and refresh tokens
- **Error Handling**: Graceful handling of authorization failures

### 2. API Routes

#### `/api/youtube/connect`
- **Method**: GET/POST
- **Purpose**: Initiates YouTube OAuth flow
- **Parameters**: `userId` (required)
- **Returns**: Google OAuth authorization URL

#### `/api/youtube/callback`
- **Method**: GET
- **Purpose**: Handles OAuth callback from Google
- **Parameters**: `code`, `state` (from Google)
- **Actions**: 
  - Exchanges authorization code for tokens
  - Fetches channel information
  - Stores data in user profile

#### `/api/youtube/disconnect`
- **Method**: POST
- **Purpose**: Disconnects YouTube account
- **Parameters**: `userId` (required)
- **Actions**: Removes YouTube tokens and data from user profile

#### `/api/youtube/sync`
- **Method**: GET/POST
- **Purpose**: Syncs latest YouTube data
- **Parameters**: `userId` (required)
- **Actions**: 
  - Refreshes tokens if needed
  - Fetches latest channel and video data
  - Updates user profile with fresh data

### 3. Data Retrieved

#### Channel Information
- Channel ID and title
- Subscriber count
- Video count
- Total view count
- Channel thumbnails
- Channel description

#### Video Analytics
- Recent video details
- View counts per video
- Like and comment counts
- Video thumbnails
- Publication dates

### 4. Database Schema Updates

#### User Model Extensions
```javascript
youtubeData: {
  accessToken: String,        // OAuth access token
  refreshToken: String,       // OAuth refresh token
  channelId: String,         // YouTube channel ID
  channelTitle: String,      // Channel display name
  subscriberCount: Number,   // Number of subscribers
  videoCount: Number,        // Number of videos
  viewCount: Number,         // Total channel views
  thumbnails: Object,        // Channel thumbnail URLs
  isConnected: Boolean,      // Connection status
  lastSynced: Date          // Last data sync timestamp
}
```

### 5. Frontend Components

#### Updated Connect Page
- Dynamic YouTube connection status
- Real-time subscriber and video counts
- Connect/Disconnect/Sync buttons
- Success/error message handling

#### YouTube Analytics Component
- Channel overview with key metrics
- Recent videos display
- Data synchronization controls
- Visual analytics dashboard

## Setup Instructions

### 1. Google Cloud Console Setup
1. Create a new project in Google Cloud Console
2. Enable YouTube Data API v3
3. Create OAuth 2.0 credentials
4. Add authorized redirect URIs:
   - `http://localhost:3001/api/youtube/callback` (development)
   - Your production callback URL

### 2. Environment Variables
Add the following to your `.env.local` file:
```bash
YOUTUBE_CLIENT_ID=your_google_client_id
YOUTUBE_CLIENT_SECRET=your_google_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:3001/api/youtube/callback
```

### 3. Required Scopes
- `https://www.googleapis.com/auth/youtube.readonly`
- `https://www.googleapis.com/auth/userinfo.profile`

## Usage Flow

### 1. Connect YouTube Account
1. User clicks "Connect" button on YouTube card
2. Redirected to Google OAuth consent screen
3. User grants permissions
4. Redirected back to SMAP with authorization code
5. System exchanges code for tokens and fetches channel data
6. User sees connected status with channel information

### 2. View Analytics
1. Connected users see real-time channel metrics
2. Subscriber count, video count, and total views displayed
3. Recent videos shown with engagement statistics
4. Last sync timestamp displayed

### 3. Sync Data
1. Users can manually trigger data refresh
2. System automatically refreshes expired tokens
3. Latest channel and video data retrieved
4. Database updated with fresh information

### 4. Disconnect Account
1. User clicks "Disconnect" button
2. All YouTube tokens and data removed from profile
3. User sees disconnected status

## Error Handling

### 1. OAuth Errors
- **Access Denied**: User cancelled authorization
- **Invalid Request**: Malformed OAuth parameters
- **Token Expired**: Automatic refresh attempted

### 2. API Errors
- **Rate Limiting**: Graceful handling of YouTube API limits
- **Network Errors**: Retry logic for temporary failures
- **Invalid Tokens**: User prompted to reconnect

### 3. User Feedback
- Clear error messages displayed
- Success confirmations shown
- Loading states during operations

## Security Considerations

### 1. Token Storage
- Access tokens encrypted in database
- Refresh tokens stored securely
- No tokens exposed to frontend

### 2. Scope Limitations
- Read-only access to YouTube data
- No posting or modification capabilities
- Minimal required permissions requested

### 3. Data Protection
- User data encrypted at rest
- Secure API endpoint authentication
- No data sharing with third parties

## Testing

### 1. API Endpoints
- All endpoints tested with valid/invalid parameters
- Error handling verified
- Token refresh flow validated

### 2. Frontend Integration
- UI state management tested
- Error message display verified
- Loading states functioning

### 3. OAuth Flow
- Complete authorization flow tested
- Callback handling verified
- Error scenarios covered

## Future Enhancements

### 1. Advanced Analytics
- Historical data tracking
- Engagement trend analysis
- Performance comparisons

### 2. Automated Insights
- Growth pattern recognition
- Content performance recommendations
- Audience engagement analysis

### 3. Reporting Features
- PDF report generation
- Scheduled email reports
- Custom dashboard widgets

## Support and Maintenance

### 1. Monitoring
- API usage tracking
- Error rate monitoring
- Performance metrics

### 2. Updates
- Regular token refresh
- API version compatibility
- Feature enhancement deployment

### 3. Documentation
- User guides and tutorials
- API reference documentation
- Troubleshooting guides
