import connectDB from '../lib/mongodb.js';
import { SocialMediaType } from '../models/SocialMediaType.js';

// Initialize default social media types
export async function initializeSocialMediaTypes() {
  try {
    await connectDB();
    
    const socialMediaTypes = [
      {
        SMType_Description: 'Instagram',
        apiEndpoint: 'https://graph.instagram.com',
        iconUrl: '/icons/instagram.svg',
        isActive: true
      },
      {
        SMType_Description: 'Facebook',
        apiEndpoint: 'https://graph.facebook.com',
        iconUrl: '/icons/facebook.svg',
        isActive: true
      },
      {
        SMType_Description: 'YouTube',
        apiEndpoint: 'https://www.googleapis.com/youtube/v3',
        iconUrl: '/icons/youtube.svg',
        isActive: true
      },
      {
        SMType_Description: 'Twitter',
        apiEndpoint: 'https://api.twitter.com/2',
        iconUrl: '/icons/twitter.svg',
        isActive: true
      },
      {
        SMType_Description: 'TikTok',
        apiEndpoint: 'https://open-api.tiktok.com',
        iconUrl: '/icons/tiktok.svg',
        isActive: false
      },
      {
        SMType_Description: 'LinkedIn',
        apiEndpoint: 'https://api.linkedin.com/v2',
        iconUrl: '/icons/linkedin.svg',
        isActive: false
      }
    ];

    // Insert social media types if they don't exist
    for (const typeData of socialMediaTypes) {
      const existingType = await SocialMediaType.findOne({ 
        SMType_Description: typeData.SMType_Description 
      });
      
      if (!existingType) {
        await SocialMediaType.create(typeData);
        console.log(`✅ Created social media type: ${typeData.SMType_Description}`);
      }
    }
    
    console.log('✅ Social media types initialized');
  } catch (error) {
    console.error('❌ Error initializing social media types:', error);
  }
}

// Get all social media types
export async function getSocialMediaTypes() {
  try {
    await connectDB();
    const types = await SocialMediaType.find({ isActive: true });
    return types;
  } catch (error) {
    console.error('❌ Error fetching social media types:', error);
    return [];
  }
}
