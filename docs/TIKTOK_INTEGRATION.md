# TikTok Integration Setup Guide

## Overview
This guide explains how to integrate TikTok into the SMAP analytics platform.

## Files Created
- `utils/tiktok.js` - TikTok API utility functions
- `app/api/tiktok/connect/route.js` - Initiates OAuth flow
- `app/api/tiktok/callback/route.js` - Handles OAuth callback
- `app/api/tiktok/disconnect/route.js` - Disconnects TikTok account
- `app/api/tiktok/sync/route.js` - Syncs TikTok analytics data

## Environment Variables Required

Add these to your `.env.local` file:

```env
TIKTOK_CLIENT_KEY=your-client-key-from-tiktok
TIKTOK_CLIENT_SECRET=your-client-secret-from-tiktok
TIKTOK_REDIRECT_URI=https://your-domain.com/api/tiktok/callback
```

### For Local Development with ngrok:
```env
TIKTOK_REDIRECT_URI=https://your-ngrok-url.ngrok-free.dev/api/tiktok/callback
```

## Getting TikTok Developer Credentials

### Step 1: Create Developer Account
1. Go to https://developers.tiktok.com/
2. Sign up/login with your TikTok account
3. Complete the developer registration

### Step 2: Create App
1. Go to "My apps" → "Create an app"
2. Fill in app details:
   - **App name**: SMAP Analytics
   - **Platform**: Web
   - **Description**: Social media analytics platform

### Step 3: Configure App
1. Set **Web/Desktop URL** to your redirect URI
2. Add **Terms of Service URL** (can be placeholder for development)
3. Add **Privacy Policy URL** (can be placeholder for development)

### Step 4: Add Login Kit
1. Click "Add products" → Add "Login Kit"
2. Set **Redirect URI** (must match `.env.local`)
3. Select required scopes:
   - `user.info.basic` - Basic user information
   - `user.info.profile` - User profile data
   - `user.info.stats` - User statistics (followers, likes)
   - `video.list` - Access to user's video list

### Step 5: Get Credentials
1. Go to app dashboard
2. Copy **Client Key** → Add to `TIKTOK_CLIENT_KEY`
3. Copy **Client Secret** → Add to `TIKTOK_CLIENT_SECRET`

## How It Works

### 1. Connection Flow
```
User clicks "Connect TikTok" 
→ /api/tiktok/connect?userId=xxx
→ Redirects to TikTok OAuth
→ User authorizes
→ /api/tiktok/callback?code=xxx
→ Exchange code for tokens
→ Store in database
→ Redirect to /connect with success message
```

### 2. Database Storage
TikTok accounts are stored in the `socialmediaaccounts` collection:

```javascript
{
  user_id: ObjectId,
  SMType_ID: ObjectId, // References TikTok type in socialmediatypes
  username: String,
  access_token: String,
  refresh_token: String,
  token_expires_at: Date,
  connected_at: Date,
  last_sync_at: Date,
  is_active: Boolean,
  account_data: {
    open_id: String,
    union_id: String,
    avatar_url: String,
    profile_url: String
  }
}
```

### 3. Token Refresh
Access tokens expire after 24 hours by default. Use the refresh token to get new access tokens:

```javascript
import { refreshTikTokToken } from './utils/tiktok';

const newTokens = await refreshTikTokToken(refreshToken);
```

## API Endpoints

### Connect TikTok
```
GET /api/tiktok/connect?userId={userId}
```
Initiates OAuth flow and redirects to TikTok authorization page.

### OAuth Callback
```
GET /api/tiktok/callback?code={code}&state={state}
```
Handles the OAuth callback, exchanges code for tokens, stores account data.

### Disconnect TikTok
```
POST /api/tiktok/disconnect
Body: { userId: "xxx" }
```
Removes TikTok connection from database.

### Sync Data
```
POST /api/tiktok/sync
Body: { userId: "xxx" }
```
Fetches latest analytics data from TikTok API.

## UI Integration

TikTok button has been added to the `/connect` page between YouTube and Twitter sections.

Features:
- Shows connected status with username
- Connect/Disconnect button
- Responsive design matching other platforms
- TikTok brand colors (black with pink/cyan gradient)

## Testing

### Local Testing with ngrok:
1. Start ngrok: `.\ngrok\ngrok.exe http 3000`
2. Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.dev`)
3. Update `.env.local` with ngrok URL
4. Update TikTok Developer Portal with same ngrok URL
5. Restart your Next.js server
6. Test connection flow

### Production:
1. Deploy your app to a domain with HTTPS
2. Update `.env.local` with production URL
3. Update TikTok Developer Portal with production URL
4. Submit app for review if required

## Troubleshooting

### "URL not verified" error in TikTok Portal
- For development, you can ignore this and proceed
- For production, you need to verify domain ownership

### "Invalid redirect URI" error
- Ensure `.env.local` and TikTok Portal have the EXACT same URL
- Check for trailing slashes, http vs https, etc.

### "Invalid client_key" error
- Verify you copied the correct Client Key from TikTok Portal
- Check for extra spaces or hidden characters

### Token expired
- Implement automatic token refresh using `refreshTikTokToken()`
- Store new tokens in database after refresh

## Future Enhancements

1. **Analytics Dashboard**: Display TikTok metrics (views, likes, shares)
2. **Video Analytics**: Show individual video performance
3. **Follower Growth**: Track follower growth over time
4. **Engagement Metrics**: Calculate engagement rates
5. **Content Insights**: Analyze best performing content

## Security Notes

- Never commit `.env.local` to version control
- Store credentials securely
- Implement token encryption for production
- Use HTTPS in production
- Validate all user inputs
- Implement rate limiting on API endpoints

## Support

For TikTok API documentation:
- Official Docs: https://developers.tiktok.com/doc/
- Login Kit: https://developers.tiktok.com/doc/login-kit-web/
- API Reference: https://developers.tiktok.com/doc/tiktok-api-v2-overview/

For SMAP integration issues:
- Check the console logs
- Verify environment variables
- Test with ngrok for local development
- Check TikTok API status page
