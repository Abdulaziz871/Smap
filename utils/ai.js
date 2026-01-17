import { GoogleGenerativeAI } from '@google/generative-ai';

// Lazy initialization to avoid build-time errors
let geminiClient = null;

function getGeminiClient() {
  if (!geminiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return geminiClient;
}

/**
 * Get content recommendations based on user's social media analytics
 */
export async function getContentRecommendations(analyticsData, platform = 'all') {
  try {
    const { facebookData, youtubeData, instagramData } = analyticsData;
    
    // Build context from available data
    let context = 'Analyze the following social media data and provide recommendations:\n\n';
    
    if (facebookData?.isConnected) {
      context += `Facebook Page: ${facebookData.pageName || 'Unknown'}
- Fans/Likes: ${facebookData.fanCount || 0}
- Talking About: ${facebookData.talkingAboutCount || 0}
- Category: ${facebookData.category || 'Unknown'}
`;
    }
    
    if (youtubeData?.isConnected) {
      context += `YouTube Channel: ${youtubeData.channelTitle || 'Unknown'}
- Subscribers: ${youtubeData.subscriberCount || 0}
- Total Views: ${youtubeData.viewCount || 0}
- Videos: ${youtubeData.videoCount || 0}
`;
    }
    
    if (instagramData?.isConnected) {
      context += `Instagram: @${instagramData.username || 'Unknown'}
- Followers: ${instagramData.followersCount || 0}
- Posts: ${instagramData.mediaCount || 0}
`;
    }

    const prompt = `${context}

Based on this social media data, provide specific, actionable recommendations in the following JSON format:
{
  "optimalPostingTimes": [
    {"day": "Monday", "time": "9:00 AM", "reason": "explanation"}
  ],
  "contentRecommendations": [
    {"type": "Video/Image/Text", "suggestion": "specific suggestion", "priority": "high/medium/low"}
  ],
  "engagementStrategies": [
    {"strategy": "strategy name", "expectedImpact": "expected result"}
  ],
  "growthOpportunities": [
    {"opportunity": "opportunity description", "implementation": "how to implement"}
  ]
}

Focus on platform: ${platform === 'all' ? 'all platforms' : platform}
Provide 3-5 items for each category. Be specific and actionable.
Return ONLY valid JSON, no markdown or explanation.`;

    const model = getGeminiClient().getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON from response (handle potential markdown wrapping)
    let jsonStr = text;
    if (text.includes('```json')) {
      jsonStr = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      jsonStr = text.split('```')[1].split('```')[0].trim();
    }
    
    const recommendations = JSON.parse(jsonStr);
    
    return {
      success: true,
      recommendations,
      platform,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting AI recommendations:', error);
    throw error;
  }
}

/**
 * Generate caption suggestions for a post
 */
export async function generateCaptionSuggestions(options) {
  const { topic, platform, tone = 'professional', includeHashtags = true, language = 'english' } = options;
  
  try {
    const prompt = `Generate 3 engaging social media captions for ${platform} about: "${topic}"

Requirements:
- Tone: ${tone}
- Language: ${language}
- ${includeHashtags ? 'Include relevant hashtags' : 'No hashtags'}
- Optimize for ${platform} best practices
- Each caption should be unique and engaging

Return ONLY valid JSON in this format:
{
  "captions": [
    {
      "style": "style description",
      "caption": "the caption text",
      "hashtags": ["#tag1", "#tag2"]
    }
  ]
}`;

    const model = getGeminiClient().getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON from response
    let jsonStr = text;
    if (text.includes('```json')) {
      jsonStr = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      jsonStr = text.split('```')[1].split('```')[0].trim();
    }
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Error generating captions:', error);
    throw error;
  }
}

/**
 * Analyze sentiment of comments or posts
 */
export async function analyzeSentiment(texts) {
  try {
    const prompt = `Analyze the sentiment of these social media texts and return a JSON summary:

Texts:
${texts.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

Return ONLY valid JSON:
{
  "overall": "positive/negative/neutral/mixed",
  "score": 0.0 to 1.0,
  "breakdown": {
    "positive": percentage,
    "negative": percentage,
    "neutral": percentage
  },
  "insights": ["key insight 1", "key insight 2"]
}`;

    const model = getGeminiClient().getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON from response
    let jsonStr = text;
    if (text.includes('```json')) {
      jsonStr = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      jsonStr = text.split('```')[1].split('```')[0].trim();
    }
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    throw error;
  }
}
