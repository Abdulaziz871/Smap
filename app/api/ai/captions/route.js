import { NextResponse } from 'next/server';
import { generateCaptionSuggestions } from '../../../../utils/ai';

export async function POST(request) {
  try {
    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'AI service not configured. Please add GEMINI_API_KEY to environment variables.',
      }, { status: 500 });
    }

    const body = await request.json();
    const { userId, topic, platform, tone, includeHashtags, language } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required',
      }, { status: 400 });
    }

    if (!topic) {
      return NextResponse.json({
        success: false,
        error: 'Topic is required',
      }, { status: 400 });
    }

    if (!platform) {
      return NextResponse.json({
        success: false,
        error: 'Platform is required',
      }, { status: 400 });
    }

    // Generate caption suggestions
    const suggestions = await generateCaptionSuggestions({
      topic,
      platform,
      tone: tone || 'professional',
      includeHashtags: includeHashtags !== false,
      language: language || 'english',
    });

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error('Error generating captions:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
