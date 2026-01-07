# Meta (Instagram & Facebook) Integration Setup

This document guides you through setting up Instagram and Facebook analytics integration using Meta's APIs.

## 🔧 Prerequisites

1. **Facebook Developer Account**: Create at [developers.facebook.com](https://developers.facebook.com/)
2. **Instagram Business Account**: Required for Instagram Analytics API
3. **Facebook Page**: Required for both Instagram Business and Facebook Page analytics

## 📱 Meta App Setup

### 1. Create a Meta App

1. Go to [Facebook Developers Console](https://developers.facebook.com/apps/)
2. Click "Create App"
3. Choose "Business" app type
4. Fill in app details

### 2. Add Required Products

Add these products to your app:
- **Instagram Basic Display**
- **Facebook Login for Business**
- **Facebook Pages API**

### 3. Configure OAuth Settings

#### Instagram Basic Display Settings:
- Valid OAuth Redirect URIs: `http://localhost:3000/api/meta/callback`
- Deauthorize Callback URL: `http://localhost:3000/api/meta/disconnect`

#### Facebook Login Settings:
- Valid OAuth Redirect URIs: `http://localhost:3000/api/meta/callback`
- Valid deauthorize callback URLs: `http://localhost:3000/api/meta/disconnect`

### 4. App Review (for Production)

For production, you'll need to submit for App Review to access:
- `instagram_basic` (auto-approved for development)
- `pages_read_engagement`
- `read_insights`
- `business_management`

## 🔐 Environment Variables

Copy `.env.meta.example` to `.env.local` and add your Meta app credentials:

```env
META_CLIENT_ID=your_meta_app_id_here
META_CLIENT_SECRET=your_meta_app_secret_here
META_REDIRECT_URI=http://localhost:3000/api/meta/callback
```

## 📊 API Endpoints

### Instagram Analytics
```
GET/POST /api/analytics/instagram?userId={userId}&startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}
```

### Facebook Analytics
```
GET/POST /api/analytics/facebook?userId={userId}&startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}
```

### Connection Management
```
GET /api/meta/connect?userId={userId}&platform={instagram|facebook}
GET /api/meta/callback (OAuth callback)
POST /api/meta/disconnect
```

## 📈 Historical Analytics Features

### Instagram Analytics Include:
- **Account Metrics**: Followers, media count, profile views
- **Media Performance**: Likes, comments, shares by date range
- **Engagement Metrics**: Average engagement, engagement rate
- **Historical Insights**: Impressions, reach, follower growth
- **Top Content**: Best performing posts in date range

### Facebook Analytics Include:
- **Page Metrics**: Fan count, talking about count, page views
- **Post Performance**: Likes, comments, shares by date range
- **Engagement Metrics**: Average engagement, engagement rate
- **Historical Insights**: Page impressions, reach, fan growth
- **Top Content**: Best performing posts in date range

## 🔄 Data Collection

### Automatic Updates
- Analytics are cached for 1 hour to respect API limits
- Use `forceRefresh=true` to bypass cache
- Historical data is stored in user profile for trend analysis

### Manual Refresh
```javascript
// Force refresh analytics
const response = await fetch('/api/analytics/instagram', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, forceRefresh: true })
});
```

## 🎯 Usage Examples

### Get Instagram Analytics for Last Month
```javascript
const startDate = new Date();
startDate.setMonth(startDate.getMonth() - 1);
const endDate = new Date();

const response = await fetch(`/api/analytics/instagram?userId=${userId}&startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`);
const data = await response.json();
```

### Generate Historical Report
```javascript
const reportResponse = await fetch('/api/reports/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId,
    reportType: 'comprehensive',
    platforms: ['instagram', 'facebook'],
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    format: 'csv'
  })
});
```

## 🚨 Important Notes

### Rate Limits
- **Instagram Basic Display**: 200 calls per hour per user
- **Facebook Graph API**: 200 calls per hour per user (varies by endpoint)
- **Instagram Business API**: Higher limits for verified business accounts

### Token Management
- Meta tokens are long-lived (60 days)
- Tokens auto-refresh before expiration
- Users need to reconnect if tokens become invalid

### Business Account Requirements
- Instagram analytics require an **Instagram Business Account**
- Personal Instagram accounts cannot access the Instagram Basic Display API insights
- Facebook analytics require **page-level permissions**

## 🔧 Troubleshooting

### Common Issues

1. **"Instagram account not connected"**
   - User needs an Instagram Business Account
   - Instagram account must be connected to a Facebook Page

2. **"Token expired"**
   - Ask user to reconnect their account
   - Implement automatic token refresh

3. **"Insufficient permissions"**
   - Check app permissions in Meta App settings
   - User may need to re-authorize with correct permissions

### Testing
- Use Meta's Graph API Explorer for testing API calls
- Test with your own Instagram Business/Facebook Page first
- Monitor webhook endpoints for real-time updates

## 📚 Additional Resources

- [Meta for Developers](https://developers.facebook.com/)
- [Instagram Basic Display API](https://developers.facebook.com/docs/instagram-basic-display-api)
- [Facebook Graph API](https://developers.facebook.com/docs/graph-api)
- [Meta Business APIs](https://developers.facebook.com/docs/marketing-apis)