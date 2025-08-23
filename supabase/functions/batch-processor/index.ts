import { corsHeaders } from '../_shared/cors.ts';

interface BatchSettings {
  clipsPerVideo: number;
  clipDuration: number;
  style: string;
  autoPost: boolean;
  platforms: string[];
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

    console.log('Starting batch processing');

    // Parse form data
    const formData = await req.formData();
    const settingsStr = formData.get('settings') as string;
    
    if (!settingsStr) {
      return new Response(
        JSON.stringify({ error: 'Missing batch settings' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const settings: BatchSettings = JSON.parse(settingsStr);
    console.log('Batch settings:', settings);

    // Get all uploaded files
    const videoFiles = [];
    for (const [key, value] of formData.entries()) {
      if (key === 'files' && value instanceof File) {
        videoFiles.push(value);
      }
    }

    console.log(`Processing ${videoFiles.length} video files`);

    // Process each video file in batch
    const batchResults = [];
    
    for (let i = 0; i < videoFiles.length; i++) {
      const videoFile = videoFiles[i];
      console.log(`Processing video ${i + 1}/${videoFiles.length}: ${videoFile.name}`);
      
      try {
        const videoResult = await processVideoForClips(videoFile, settings);
        batchResults.push({
          filename: videoFile.name,
          success: true,
          clipsGenerated: videoResult.clips.length,
          clips: videoResult.clips,
          processingTime: videoResult.processingTime
        });
        
      } catch (error) {
        console.error(`Error processing ${videoFile.name}:`, error);
        batchResults.push({
          filename: videoFile.name,
          success: false,
          error: error.message,
          clipsGenerated: 0,
          clips: []
        });
      }
    }

    const totalClips = batchResults.reduce((sum, result) => sum + result.clipsGenerated, 0);
    const successfulVideos = batchResults.filter(result => result.success).length;

    console.log(`Batch processing completed: ${totalClips} clips from ${successfulVideos}/${videoFiles.length} videos`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          totalVideos: videoFiles.length,
          successfulVideos,
          totalClipsGenerated: totalClips,
          processingTime: `${videoFiles.length * 30} seconds` // Mock processing time
        },
        results: batchResults
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
    console.error('Batch processing error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Batch processing failed',
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

async function processVideoForClips(videoFile: File, settings: BatchSettings) {
  console.log(`Generating ${settings.clipsPerVideo} clips from ${videoFile.name}`);
  
  // Simulate AI analysis and clip generation
  const processingStartTime = Date.now();
  
  // Mock clip generation process
  const clips = [];
  for (let i = 0; i < settings.clipsPerVideo; i++) {
    // Simulate processing time for each clip
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const clipId = `clip_${Date.now()}_${i}`;
    const clip = {
      id: clipId,
      title: generateClipTitle(settings.style, i + 1),
      duration: settings.clipDuration,
      startTime: i * 30, // Mock start times
      url: `https://example.com/batch-clips/${clipId}.mp4`,
      thumbnail: `https://example.com/batch-clips/${clipId}_thumb.jpg`,
      style: settings.style,
      viralScore: Math.floor(Math.random() * 100) + 1
    };
    
    clips.push(clip);
    
    // If auto-post is enabled, simulate posting
    if (settings.autoPost && settings.platforms.length > 0) {
      console.log(`Auto-posting clip ${i + 1} to platforms...`);
      
      for (const platform of settings.platforms) {
        try {
          await postClipToPlatform(clip, platform);
          clip.posted = true;
          clip.platforms = [...(clip.platforms || []), platform];
        } catch (error) {
          console.error(`Failed to post clip to ${platform}:`, error);
        }
      }
    }
  }
  
  const processingTime = Date.now() - processingStartTime;
  
  return {
    clips,
    processingTime: Math.round(processingTime / 1000) // in seconds
  };
}

function generateClipTitle(style: string, clipNumber: number): string {
  const titleTemplates = {
    viral: [
      `🔥 Viral Moment #${clipNumber}`,
      `This Will Blow Your Mind! Part ${clipNumber}`,
      `Insane Clip #${clipNumber} - Wait For It!`,
      `You Won't Believe This! #${clipNumber}`
    ],
    teaser: [
      `Teaser #${clipNumber}: What Happens Next?`,
      `Sneak Peek #${clipNumber}`,
      `Coming Up... Part ${clipNumber}`,
      `Preview #${clipNumber}: Epic Moment`
    ],
    highlight: [
      `Best Moment #${clipNumber}`,
      `Highlight Reel Part ${clipNumber}`,
      `Epic Scene #${clipNumber}`,
      `Must-Watch Moment #${clipNumber}`
    ],
    mixed: [
      `Amazing Clip #${clipNumber}`,
      `Epic Moment #${clipNumber}`,
      `Incredible Scene #${clipNumber}`,
      `Awesome Part #${clipNumber}`
    ]
  };
  
  const templates = titleTemplates[style as keyof typeof titleTemplates] || titleTemplates.mixed;
  return templates[clipNumber % templates.length];
}

async function postClipToPlatform(clip: any, platform: string) {
  // Simulate posting delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log(`Posted "${clip.title}" to ${platform}`);
  
  // Mock successful posting
  return {
    success: true,
    platform,
    postId: `${platform}_${clip.id}`,
    url: `https://${platform.toLowerCase()}.com/post/${clip.id}`
  };
}