import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BrandRequest {
  action: 'apply_watermark' | 'get_templates' | 'create_template' | 'apply_template';
  video_url?: string;
  template_id?: string;
  brand_config?: {
    logo_url?: string;
    watermark_position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity?: number;
    size?: 'small' | 'medium' | 'large';
    brand_colors?: {
      primary: string;
      secondary: string;
      accent: string;
    };
    fonts?: {
      heading: string;
      body: string;
      caption: string;
    };
    intro_template?: any;
    outro_template?: any;
  };
  template_data?: {
    name: string;
    is_public: boolean;
    price: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization')!;
    const { data: userData } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (!userData.user) {
      throw new Error('Unauthorized');
    }

    const { action, video_url, template_id, brand_config, template_data } = await req.json() as BrandRequest;

    let result: any = {};

    switch (action) {
      case 'apply_watermark':
        result = await applyWatermark(video_url!, brand_config!, supabase);
        break;
      
      case 'get_templates':
        result = await getBrandTemplates(userData.user.id, supabase);
        break;
      
      case 'create_template':
        result = await createBrandTemplate(userData.user.id, brand_config!, template_data!, supabase);
        break;
      
      case 'apply_template':
        result = await applyBrandTemplate(template_id!, video_url, supabase);
        break;
      
      default:
        throw new Error('Invalid action');
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Brand manager error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function applyWatermark(video_url: string, brand_config: any, supabase: any) {
  // Mock watermark application - would use video processing AI
  const watermarkData = {
    original_video_url: video_url,
    watermarked_video_url: `${video_url.replace('.mp4', '')}_watermarked.mp4`,
    watermark_applied: true,
    watermark_config: {
      position: brand_config.watermark_position || 'bottom-right',
      opacity: brand_config.opacity || 0.8,
      size: brand_config.size || 'medium',
      logo_url: brand_config.logo_url
    },
    processing_time_ms: 3200
  };

  console.log('Watermark applied:', watermarkData);
  return watermarkData;
}

async function getBrandTemplates(userId: string, supabase: any) {
  const { data: userTemplates, error: userError } = await supabase
    .from('brand_templates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (userError) throw userError;

  const { data: publicTemplates, error: publicError } = await supabase
    .from('brand_templates')
    .select('*')
    .eq('is_public', true)
    .order('sales_count', { ascending: false })
    .limit(20);

  if (publicError) throw publicError;

  return {
    user_templates: userTemplates || [],
    public_templates: publicTemplates || [],
    total_count: (userTemplates?.length || 0) + (publicTemplates?.length || 0)
  };
}

async function createBrandTemplate(userId: string, brand_config: any, template_data: any, supabase: any) {
  const templateRecord = {
    user_id: userId,
    name: template_data.name,
    logo_url: brand_config.logo_url,
    watermark_position: brand_config.watermark_position || 'bottom-right',
    brand_colors: brand_config.brand_colors || {
      primary: '#3B82F6',
      secondary: '#10B981', 
      accent: '#F59E0B'
    },
    fonts: brand_config.fonts || {
      heading: 'Inter',
      body: 'Inter',
      caption: 'Inter'
    },
    intro_template: brand_config.intro_template,
    outro_template: brand_config.outro_template,
    overlay_settings: {},
    is_public: template_data.is_public || false,
    price: template_data.price || 0
  };

  const { data, error } = await supabase
    .from('brand_templates')
    .insert(templateRecord)
    .select()
    .single();

  if (error) throw error;

  return {
    template_id: data.id,
    message: 'Brand template created successfully',
    template: data
  };
}

async function applyBrandTemplate(templateId: string, video_url: string | undefined, supabase: any) {
  const { data: template, error } = await supabase
    .from('brand_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) throw error;

  // Mock template application - would apply brand settings to video
  const appliedTemplate = {
    template_id: templateId,
    template_name: template.name,
    video_url: video_url,
    branded_video_url: video_url ? `${video_url.replace('.mp4', '')}_branded.mp4` : null,
    applied_settings: {
      brand_colors: template.brand_colors,
      fonts: template.fonts,
      watermark_position: template.watermark_position,
      logo_url: template.logo_url
    },
    processing_time_ms: 4500
  };

  // Increment usage count if it's a public template
  if (template.is_public) {
    await supabase
      .from('brand_templates')
      .update({ sales_count: (template.sales_count || 0) + 1 })
      .eq('id', templateId);
  }

  console.log('Template applied:', appliedTemplate);
  return appliedTemplate;
}