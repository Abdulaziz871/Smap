# Google YouTube API Setup Guide

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Create Project" or select an existing project
3. Name your project (e.g., "SMAP YouTube Integration")

## Step 2: Enable YouTube Data API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "YouTube Data API v3"
3. Click on it and press "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Name it (e.g., "SMAP YouTube OAuth")
5. Add Authorized redirect URIs:
   - `http://localhost:3001/api/youtube/callback`
   - `http://localhost:3002/api/youtube/callback`
   - Add your production URL when ready

## Step 4: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" (for testing with any Google account)
3. Fill in required fields:
   - App name: "SMAP Analytics"
   - User support email: your email
   - Developer contact: your email
4. Add scopes:
   - `../auth/youtube.readonly`
   - `../auth/userinfo.profile`
5. Add test users (your Google account email)

## Step 5: Update Environment Variables

After creating credentials, update your `.env.local`:

```bash
YOUTUBE_CLIENT_ID=your_actual_client_id_here
YOUTUBE_CLIENT_SECRET=your_actual_client_secret_here
YOUTUBE_REDIRECT_URI=http://localhost:3001/api/youtube/callback
```

## Step 6: Restart Your Application

After updating environment variables, restart your Next.js server:
```bash
npm run dev
```

## Test the Integration

1. Make sure you're logged into your SMAP account
2. Go to `/connect` page
3. Click "Connect" on YouTube
4. You should be redirected to Google OAuth
5. Grant permissions
6. You'll be redirected back to SMAP with your YouTube data

## Troubleshooting

- **"OAuth error"**: Check your redirect URI matches exactly
- **"Access denied"**: Make sure test users are added to OAuth consent screen
- **"Invalid client"**: Verify client ID and secret are correct
- **"Not logged in"**: Log into SMAP first before connecting YouTube
