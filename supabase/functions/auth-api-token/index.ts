import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { corsHeaders } from '../_shared/cors.ts';

interface Database {
  public: {
    Tables: {
      api_tokens: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          token_hash: string;
          permissions: any;
          scopes: string[];
          expires_at: string | null;
          last_used_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          token_hash: string;
          permissions?: any;
          scopes?: string[];
          expires_at?: string | null;
          last_used_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          token_hash?: string;
          permissions?: any;
          scopes?: string[];
          expires_at?: string | null;
          last_used_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

const supabase = createClient<Database>(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

async function verifyToken(token: string, expectedHash: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  
  return hash === expectedHash;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, requiredScopes = [] } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'API token is required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Find the token in database
    const { data: tokenData, error: tokenError } = await supabase
      .from('api_tokens')
      .select('*')
      .eq('is_active', true)
      .single();

    if (tokenError || !tokenData) {
      console.error('Token lookup error:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify token hash
    const isValid = await verifyToken(token, tokenData.token_hash);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if token is expired
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Token expired' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check scopes
    if (requiredScopes.length > 0) {
      const hasRequiredScopes = requiredScopes.every((scope: string) => 
        tokenData.scopes.includes(scope)
      );

      if (!hasRequiredScopes) {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Update last used timestamp
    await supabase
      .from('api_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: tokenData.user_id,
        scopes: tokenData.scopes,
        token_name: tokenData.name
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Auth API token error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});