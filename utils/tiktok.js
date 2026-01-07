import fetch from 'node-fetch';

const TIKTOK_CONFIG = {
  clientKey: process.env.TIKTOK_CLIENT_KEY,
  clientSecret: process.env.TIKTOK_CLIENT_SECRET,
  redirectUri: process.env.TIKTOK_REDIRECT_URI,
  baseUrl: 'https://open.tiktokapis.com'
};

// Scopes needed for analytics
const SCOPES = [
  'user.info.basic',
  'user.info.profile',
  'user.info.stats',
  'video.list'
];

/**
 * Generate TikTok OAuth authorization URL
 */
export function getTikTokAuthUrl(userId) {
  const state = JSON.stringify({ userId, platform: 'tiktok' });
  const csrfState = Buffer.from(state).toString('base64');
  
  const params = new URLSearchParams({
    client_key: TIKTOK_CONFIG.clientKey,
    scope: SCOPES.join(','),
    response_type: 'code',
    redirect_uri: TIKTOK_CONFIG.redirectUri,
    state: csrfState
  });
  
  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

/**
 * Exchange authorization code for access tokens
 */
export async function getTikTokTokens(code) {
  try {
    const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache'
      },
      body: new URLSearchParams({
        client_key: TIKTOK_CONFIG.clientKey,
        client_secret: TIKTOK_CONFIG.clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: TIKTOK_CONFIG.redirectUri
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error_description || 'Failed to get tokens');
    }

    return data;
  } catch (error) {
    console.error('Error getting TikTok tokens:', error);
    throw error;
  }
}

/**
 * Get TikTok user information
 */
export async function getTikTokUserInfo(accessToken) {
  try {
    const response = await fetch('https://open.tiktokapis.com/v2/user/info/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to get user info');
    }

    return data.data;
  } catch (error) {
    console.error('Error getting TikTok user info:', error);
    throw error;
  }
}

/**
 * Get TikTok user statistics
 */
export async function getTikTokUserStats(accessToken) {
  try {
    const response = await fetch('https://open.tiktokapis.com/v2/research/user/info/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error getting TikTok user stats:', error);
    throw error;
  }
}

/**
 * Refresh TikTok access token
 */
export async function refreshTikTokToken(refreshToken) {
  try {
    const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_key: TIKTOK_CONFIG.clientKey,
        client_secret: TIKTOK_CONFIG.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    return await response.json();
  } catch (error) {
    console.error('Error refreshing TikTok token:', error);
    throw error;
  }
}
