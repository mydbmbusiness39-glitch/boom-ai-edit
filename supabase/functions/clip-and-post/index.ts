import { corsHeaders } from '../_shared/cors.ts';

interface ClipPostRequest {
  settings: {
    duration: number;
    style: string;
    caption?: string;
    platforms: string[];
    hashtags: string;
    startTime: number;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    console.log('Processing clip and post request');

    // Parse form data
    const formData = await req.formData();
    const videoFile = formData.get('file') as File;
    const settingsStr = formData.get('settings') as string;
    
    if (!videoFile || !settingsStr) {
      return new Response(
        JSON.stringify({ error: 'Missing video file or settings' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const settings: ClipPostRequest['settings'] = JSON.parse(settingsStr);
    console.log('Clip settings:', settings);

    // Step 1: Extract viral clip using AI
    console.log('Step 1: Extracting viral clip...');
    
    // Simulate AI clip extraction
    await new Promise(resolve => setTimeout(resolve, 2000));
    const clipUrl = `https://example.com/clips/viral-clip-${Date.now()}.mp4`;

    // Step 2: Generate AI captions if none provided
    console.log('Step 2: Generating AI captions...');
    let finalCaption = settings.caption;
    
    if (!finalCaption) {
      // Simulate AI caption generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const captionStyles = {
        viral: "🔥 This is INSANE! You won't believe what happens next... ",
        teaser: "Wait for it... This will blow your mind! 🤯",
        highlight: "The best moment from our latest video! ✨",
        intro: "Here's what you need to know about this... 💡"
      };
      
      finalCaption = captionStyles[settings.style as keyof typeof captionStyles] || captionStyles.viral;
    }

    // Add hashtags
    if (settings.hashtags) {
      finalCaption += ` ${settings.hashtags}`;
    }

    // Step 3: Add branding/watermark
    console.log('Step 3: Adding branding...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    const brandedClipUrl = `https://example.com/clips/branded-${Date.now()}.mp4`;

    // Step 4: Post to social platforms
    console.log('Step 4: Posting to platforms...');
    const postResults = [];

    for (const platform of settings.platforms) {
      console.log(`Posting to ${platform}...`);
      
      try {
        // Simulate platform-specific posting
        const platformResult = await postToSocialPlatform(platform, {
          videoUrl: brandedClipUrl,
          caption: finalCaption,
          duration: settings.duration
        });
        
        postResults.push({
          platform,
          success: true,
          postId: platformResult.id,
          url: platformResult.url
        });
        
      } catch (error) {
        console.error(`Failed to post to ${platform}:`, error);
        postResults.push({
          platform,
          success: false,
          error: error.message
        });
      }
    }

    console.log('Clip and post process completed');

    return new Response(
      JSON.stringify({
        success: true,
        clipUrl: brandedClipUrl,
        caption: finalCaption,
        postResults,
        message: `Successfully posted to ${postResults.filter(r => r.success).length}/${settings.platforms.length} platforms`
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
    console.error('Clip and post error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Clip and post failed',
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

async function postToSocialPlatform(platform: string, content: any) {
  // Simulate posting delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock successful post response
  const mockPostId = `${platform.toLowerCase()}_${Date.now()}`;
  
  switch (platform.toLowerCase()) {
    case 'tiktok':
      return {
        id: mockPostId,
        url: `https://tiktok.com/@user/video/${mockPostId}`,
        platform: 'TikTok'
      };
    
    case 'youtube-shorts':
      return {
        id: mockPostId,
        url: `https://youtube.com/shorts/${mockPostId}`,
        platform: 'YouTube Shorts'
      };
    
    case 'instagram-reels':
      return {
        id: mockPostId,
        url: `https://instagram.com/reel/${mockPostId}`,
        platform: 'Instagram Reels'
      };
    
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}