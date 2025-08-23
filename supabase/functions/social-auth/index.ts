import { corsHeaders } from '../_shared/cors.ts';

interface SocialAuthRequest {
  platform: string;
  code?: string;
  redirectUri?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { platform, code, redirectUri }: SocialAuthRequest = await req.json();
    
    console.log(`Processing social auth for platform: ${platform}`);

    // Get platform-specific environment variables
    const platformConfig = getPlatformConfig(platform);
    
    if (!platformConfig.clientId || !platformConfig.clientSecret) {
      throw new Error(`Missing API credentials for ${platform}. Please configure in Supabase secrets.`);
    }

    let authResult;

    if (code) {
      // Handle OAuth callback - exchange code for access token
      authResult = await exchangeCodeForToken(platform, code, redirectUri, platformConfig);
    } else {
      // Return OAuth authorization URL
      const authUrl = generateAuthUrl(platform, platformConfig);
      return new Response(
        JSON.stringify({ 
          authUrl,
          message: `Redirect user to ${platform} authorization` 
        }),
        { 
          status: 200, 
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Fetch user profile information
    const userProfile = await fetchUserProfile(platform, authResult.accessToken);

    console.log(`Successfully authenticated ${platform} user: ${userProfile.username}`);

    return new Response(
      JSON.stringify({
        success: true,
        platform,
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken,
        profile: userProfile,
        message: `Successfully connected to ${platform}`
      }),
      { 
        status: 200, 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Social auth error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Social authentication failed',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});

function getPlatformConfig(platform: string) {
  switch (platform) {
    case 'tiktok':
      return {
        clientId: Deno.env.get('TIKTOK_CLIENT_ID'),
        clientSecret: Deno.env.get('TIKTOK_CLIENT_SECRET'),
        scope: 'user.info.basic,video.upload',
        authUrl: 'https://www.tiktok.com/auth/authorize/',
        tokenUrl: 'https://open-api.tiktok.com/oauth/access_token/',
        apiUrl: 'https://open-api.tiktok.com'
      };
    
    case 'youtube-shorts':
      return {
        clientId: Deno.env.get('YOUTUBE_CLIENT_ID'),
        clientSecret: Deno.env.get('YOUTUBE_CLIENT_SECRET'),
        scope: 'https://www.googleapis.com/auth/youtube.upload',
        authUrl: 'https://accounts.google.com/o/oauth2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        apiUrl: 'https://www.googleapis.com/youtube/v3'
      };
    
    case 'instagram-reels':
      return {
        clientId: Deno.env.get('INSTAGRAM_CLIENT_ID'),
        clientSecret: Deno.env.get('INSTAGRAM_CLIENT_SECRET'),
        scope: 'instagram_basic,instagram_content_publish',
        authUrl: 'https://api.instagram.com/oauth/authorize',
        tokenUrl: 'https://api.instagram.com/oauth/access_token',
        apiUrl: 'https://graph.instagram.com'
      };
    
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

function generateAuthUrl(platform: string, config: any): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    scope: config.scope,
    redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/social-auth`
  });

  return `${config.authUrl}?${params.toString()}`;
}

async function exchangeCodeForToken(platform: string, code: string, redirectUri: string, config: any) {
  const tokenData = {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri
  };

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(tokenData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed for ${platform}: ${errorText}`);
  }

  const tokenResponse = await response.json();
  
  return {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresIn: tokenResponse.expires_in
  };
}

async function fetchUserProfile(platform: string, accessToken: string) {
  const config = getPlatformConfig(platform);
  
  let profileUrl: string;
  
  switch (platform) {
    case 'tiktok':
      profileUrl = `${config.apiUrl}/v2/user/info/`;
      break;
    case 'youtube-shorts':
      profileUrl = `${config.apiUrl}/channels?part=snippet&mine=true`;
      break;
    case 'instagram-reels':
      profileUrl = `${config.apiUrl}/me?fields=id,username,account_type`;
      break;
    default:
      throw new Error(`Profile fetch not implemented for ${platform}`);
  }

  const response = await fetch(profileUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Profile fetch failed for ${platform}: ${errorText}`);
  }

  const profileData = await response.json();
  
  // Normalize profile data across platforms
  switch (platform) {
    case 'tiktok':
      return {
        id: profileData.data.user.open_id,
        username: profileData.data.user.display_name,
        followers: profileData.data.user.follower_count
      };
    case 'youtube-shorts':
      const channel = profileData.items[0];
      return {
        id: channel.id,
        username: channel.snippet.title,
        followers: channel.statistics?.subscriberCount || 0
      };
    case 'instagram-reels':
      return {
        id: profileData.id,
        username: profileData.username,
        followers: null // Requires additional API call
      };
    default:
      return profileData;
  }
}