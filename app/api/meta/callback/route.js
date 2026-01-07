import connectDB from '@/lib/mongodb.js';
import { User } from '@/models/User.js';
import { SocialMediaAccount } from '@/models/SocialMediaAccount.js';
import { SocialMediaType } from '@/models/SocialMediaType.js';
import { getMetaTokens, getInstagramAccountInfo, getFacebookPageInfo } from '@/utils/meta.js';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    if (error) {
      console.error('Meta OAuth error:', error);
      return new Response(`
        <html>
          <body>
            <script>
              window.opener.postMessage({
                success: false,
                error: '${error}'
              }, '*');
              window.close();
            </script>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    if (!code || !state) {
      return new Response(`
        <html>
          <body>
            <script>
              window.opener.postMessage({
                success: false,
                error: 'Missing authorization code or state'
              }, '*');
              window.close();
            </script>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    try {
      const stateData = JSON.parse(state);
      const { platform, userId } = stateData;
      
      // Exchange code for tokens
      const tokens = await getMetaTokens(code, platform);
      
      let accountData = {};
      
      if (platform === 'instagram') {
        // Get Instagram account information
        const instagramAccount = await getInstagramAccountInfo(tokens.access_token);
        
        accountData = {
          instagramData: {
            isConnected: true,
            accessToken: tokens.access_token,
            pageAccessToken: instagramAccount.pageAccessToken,
            accountId: instagramAccount.id,
            username: instagramAccount.username,
            name: instagramAccount.name,
            followersCount: instagramAccount.followersCount,
            mediaCount: instagramAccount.mediaCount,
            pageId: instagramAccount.pageId,
            connectedAt: new Date(),
            lastSynced: new Date()
          }
        };
      } else if (platform === 'facebook') {
        // Get Facebook page information (includes page access token)
        const pageInfo = await getFacebookPageInfo(tokens.access_token);
        
        console.log('📌 Page Access Token received:', pageInfo.accessToken ? 'Yes' : 'No');
        
        accountData = {
          facebookData: {
            isConnected: true,
            accessToken: tokens.access_token, // User access token
            pageAccessToken: pageInfo.accessToken || tokens.access_token, // Page access token (preferred)
            pageId: pageInfo.id,
            pageName: pageInfo.name,
            fanCount: pageInfo.fanCount,
            talkingAboutCount: pageInfo.talkingAboutCount,
            category: pageInfo.category,
            connectedAt: new Date(),
            lastSynced: new Date()
          }
        };
        
        // Also create SocialMediaAccount record for Facebook
        // Get or create Facebook social media type
        let facebookType = await SocialMediaType.findOne({ SMType_Description: 'Facebook' });
        if (!facebookType) {
          facebookType = await SocialMediaType.create({
            SMType_Description: 'Facebook',
            iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg'
          });
        }
        
        // Check if Facebook account already exists for this user
        const existingAccount = await SocialMediaAccount.findOne({
          user_id: userId,
          SMType_ID: facebookType._id
        });
        
        if (existingAccount) {
          // Update existing account
          await SocialMediaAccount.findByIdAndUpdate(existingAccount._id, {
            username: pageInfo.name,
            access_token: tokens.access_token,
            last_sync_at: new Date()
          });
        } else {
          // Create new account
          await SocialMediaAccount.create({
            user_id: userId,
            SMType_ID: facebookType._id,
            username: pageInfo.name,
            access_token: tokens.access_token,
            refresh_token: null,
            connected_at: new Date(),
            last_sync_at: new Date()
          });
        }
      }
      
      // Update user with account data
      await User.findByIdAndUpdate(userId, {
        $set: accountData
      });
      
      console.log(`✅ ${platform} account connected successfully for user:`, userId);
      console.log(`📊 Account Data:`, accountData);
      
      // Prepare success message with account details
      let successMessage = '';
      let accountDetails = {};
      
      if (platform === 'instagram') {
        successMessage = `Instagram account @${accountData.instagramData.username} connected successfully!`;
        accountDetails = {
          username: accountData.instagramData.username,
          followers: accountData.instagramData.followersCount,
          posts: accountData.instagramData.mediaCount
        };
        console.log(`✅ Instagram: @${accountData.instagramData.username} - ${accountData.instagramData.followersCount} followers, ${accountData.instagramData.mediaCount} posts`);
      } else if (platform === 'facebook') {
        successMessage = `Facebook page ${accountData.facebookData.pageName} connected successfully!`;
        accountDetails = {
          pageName: accountData.facebookData.pageName,
          likes: accountData.facebookData.fanCount
        };
        console.log(`✅ Facebook: ${accountData.facebookData.pageName} - ${accountData.facebookData.fanCount} likes`);
      }
      
      return new Response(`
        <html>
          <head>
            <meta charset="UTF-8">
          </head>
          <body>
            <script>
              const messageData = ${JSON.stringify({
                success: true,
                platform: platform,
                message: successMessage,
                accountDetails: accountDetails
              })};
              
              if (window.opener) {
                window.opener.postMessage(messageData, '*');
                window.close();
              }
            </script>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
      
    } catch (tokenError) {
      console.error('Meta token exchange error:', tokenError);
      const errorMessage = tokenError.message.replace(/'/g, "\\'").replace(/\n/g, ' ');
      return new Response(`
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
              .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px; }
              .instructions { background: #eff8ff; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin-top: 15px; }
              button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 10px; }
            </style>
          </head>
          <body>
            <div class="error">
              <h2>⚠️ Connection Failed</h2>
              <p>${errorMessage}</p>
            </div>
            <div class="instructions">
              <h3>📱 How to Fix:</h3>
              <ol>
                <li><strong>Open Instagram app</strong> on your phone</li>
                <li>Go to <strong>Profile → Settings → Account type and tools</strong></li>
                <li>Tap <strong>"Switch to professional account"</strong></li>
                <li>Choose <strong>"Business"</strong> (not Creator)</li>
                <li>Select a category and complete setup</li>
                <li>Go to <strong>Settings → Sharing to other apps → Facebook</strong></li>
                <li>Make sure it's linked to your <strong>Pxlldes</strong> page</li>
              </ol>
            </div>
            <button onclick="window.close()">Close Window</button>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  success: false,
                  error: '${errorMessage}'
                }, '*');
              }
              setTimeout(() => { if (window.opener) window.close(); }, 15000);
            </script>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
  } catch (error) {
    console.error('Meta callback error:', error);
    return new Response(`
      <html>
        <body>
          <script>
            window.opener.postMessage({
              success: false,
              error: 'Internal server error'
            }, '*');
            window.close();
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}