# AI Content Recommendations & Scheduled Publishing

This document explains how to set up and use the AI-powered content recommendations and scheduled post publishing features.

## Features Overview

### 1. AI-Powered Content Recommendations
- **Optimal Posting Times**: AI analyzes your engagement data to suggest the best times to post
- **Content Recommendations**: Get suggestions on what types of content perform best
- **Engagement Strategies**: Personalized strategies to improve your engagement
- **Growth Opportunities**: Insights on how to grow your social media presence

### 2. AI Caption Generator
- Generate engaging captions for any topic
- Multiple tone options: Professional, Casual, Humorous, Inspirational, Educational
- Automatic hashtag suggestions
- Platform-specific optimization

### 3. Scheduled Post Publishing (Facebook)
- Schedule posts for future publishing
- Automatic publishing at scheduled times
- Support for text, link, and media posts
- Retry mechanism for failed posts

## Setup Instructions

### 1. OpenAI API Key

Add your OpenAI API key to the environment variables:

```env
# .env.local
OPENAI_API_KEY=your-openai-api-key-here
```

Get your API key from: https://platform.openai.com/api-keys

### 2. Facebook Page Permissions

For scheduled publishing to work, your Facebook app needs the `pages_manage_posts` permission:

1. Go to [Meta Developer Console](https://developers.facebook.com/)
2. Select your app
3. Navigate to **App Review** → **Permissions and Features**
4. Request the `pages_manage_posts` permission
5. Reconnect your Facebook page in SMAP to get the updated permissions

### 3. Cron Job Setup (For Auto-Publishing)

The scheduled posts need to be processed by a cron job. There are several options:

#### Option A: Vercel Cron (Recommended for Vercel deployments)

The `vercel.json` file is already configured to run the cron job every minute:

```json
{
  "crons": [
    {
      "path": "/api/scheduled-posts/process",
      "schedule": "* * * * *"
    }
  ]
}
```

> Note: Vercel Cron is available on Pro and Enterprise plans.

#### Option B: External Cron Service

Use a free service like [cron-job.org](https://cron-job.org/):

1. Create an account
2. Add a new cron job
3. Set the URL to: `https://your-domain.com/api/scheduled-posts/process?secret=YOUR_CRON_SECRET`
4. Set frequency to every 1 minute
5. Add the secret to your environment:

```env
CRON_SECRET=your-secure-random-string
```

#### Option C: GitHub Actions

Create `.github/workflows/cron.yml`:

```yaml
name: Process Scheduled Posts

on:
  schedule:
    - cron: '* * * * *'  # Every minute

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger process endpoint
        run: |
          curl -X GET "https://your-domain.com/api/scheduled-posts/process?secret=${{ secrets.CRON_SECRET }}"
```

## API Endpoints

### AI Recommendations

**GET** `/api/ai/recommendations`
- Query params: `platform` (optional) - 'all', 'facebook', 'youtube', 'instagram'
- Returns AI-powered content recommendations

**POST** `/api/ai/recommendations`
- Body: `{ platform: string, customData?: object }`
- Returns recommendations based on provided data

### AI Captions

**POST** `/api/ai/captions`
- Body:
```json
{
  "topic": "Product launch announcement",
  "platform": "facebook",
  "tone": "professional",
  "includeHashtags": true,
  "language": "english"
}
```

### Scheduled Posts

**GET** `/api/scheduled-posts`
- Query params: `status`, `platform`, `limit`, `page`
- Returns list of scheduled posts

**POST** `/api/scheduled-posts`
- Body:
```json
{
  "platform": "facebook",
  "message": "Your post content",
  "link": "https://optional-link.com",
  "scheduledTime": "2024-12-25T10:00:00Z",
  "timezone": "UTC"
}
```

**PUT** `/api/scheduled-posts`
- Update a scheduled post

**DELETE** `/api/scheduled-posts?postId=xxx`
- Cancel a scheduled post

### Facebook Publishing

**POST** `/api/facebook/publish`
- Body (for immediate publish):
```json
{
  "immediate": true,
  "message": "Your post content"
}
```
- Body (for scheduled post):
```json
{
  "scheduledPostId": "xxx"
}
```

### Process Scheduled Posts

**GET** `/api/scheduled-posts/process?secret=xxx`
- Called by cron job to process pending scheduled posts
- Requires `CRON_SECRET` environment variable for security

## Usage Guide

### Accessing the Feature

1. Log in to SMAP
2. Click on "Schedule & AI" in the sidebar
3. You'll see three tabs:
   - **Schedule Post**: Create and manage scheduled posts
   - **AI Recommendations**: Get AI-powered insights
   - **Caption Generator**: Generate engaging captions

### Getting AI Recommendations

1. Go to the "AI Recommendations" tab
2. Select a platform (or "All Platforms")
3. Click "Get Recommendations"
4. Wait for the AI to analyze your data
5. Review the recommendations for:
   - Best posting times
   - Content types
   - Engagement strategies
   - Growth opportunities

### Generating Captions

1. Go to the "Caption Generator" tab
2. Enter your post topic/description
3. Select the platform and tone
4. Click "Generate Captions"
5. Choose from 3 different caption styles
6. Click "Use this caption" to auto-fill the scheduling form

### Scheduling a Post

1. Go to the "Schedule Post" tab
2. Select platform (Facebook)
3. Enter your message
4. Optionally add a link
5. Set the date and time
6. Click "Schedule Post"

The post will be automatically published at the scheduled time.

## Troubleshooting

### AI Recommendations Not Working
- Check that `OPENAI_API_KEY` is set in environment variables
- Ensure you have at least one social media account connected
- Check the browser console for error messages

### Scheduled Posts Not Publishing
- Verify the cron job is running (check logs)
- Ensure Facebook page is connected with `pages_manage_posts` permission
- Check the `CRON_SECRET` matches in environment and cron job URL
- Review failed posts in the history for error messages

### Facebook Publishing Errors
- Reconnect your Facebook page to get fresh tokens
- Check that your app has the required permissions
- Verify the page access token is not expired
