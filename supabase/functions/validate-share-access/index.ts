import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { token, password, email } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'missing_token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[validate-share-access] Validating token: ${token}`);

    // Get share by token
    const { data: share, error: shareError } = await supabase
      .from('shared_recordings')
      .select('*')
      .eq('share_token', token)
      .single();

    if (shareError || !share) {
      console.error('[validate-share-access] Share not found:', shareError);
      return new Response(
        JSON.stringify({ valid: false, reason: 'not_found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if active
    if (!share.is_active) {
      console.log('[validate-share-access] Share is not active');
      return new Response(
        JSON.stringify({ valid: false, reason: 'inactive' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if revoked
    if (share.revoked_at) {
      console.log('[validate-share-access] Share was revoked');
      return new Response(
        JSON.stringify({ valid: false, reason: 'revoked' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    const expiryDate = new Date(share.expires_at);
    if (expiryDate < new Date()) {
      console.log('[validate-share-access] Share has expired');
      return new Response(
        JSON.stringify({ valid: false, reason: 'expired' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check max views
    if (share.max_views && share.view_count >= share.max_views) {
      console.log('[validate-share-access] Max views reached');
      return new Response(
        JSON.stringify({ valid: false, reason: 'max_views' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check password if required
    if (share.require_password) {
      if (!password) {
        console.log('[validate-share-access] Password required but not provided');
        return new Response(
          JSON.stringify({ valid: false, reason: 'password_required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Simple comparison - in production, use bcrypt
      if (password !== share.password_hash) {
        console.log('[validate-share-access] Incorrect password');
        return new Response(
          JSON.stringify({ valid: false, reason: 'wrong_password' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check allowed emails if configured
    if (share.allowed_emails && share.allowed_emails.length > 0) {
      if (!email) {
        console.log('[validate-share-access] Email required but not provided');
        return new Response(
          JSON.stringify({ valid: false, reason: 'email_required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!share.allowed_emails.includes(email)) {
        console.log('[validate-share-access] Email not in allowed list');
        return new Response(
          JSON.stringify({ valid: false, reason: 'not_allowed' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get call log data
    const { data: callLog, error: callError } = await supabase
      .from('call_logs')
      .select('*')
      .eq('id', share.call_log_id)
      .single();

    if (callError || !callLog) {
      console.error('[validate-share-access] Call log not found:', callError);
      return new Response(
        JSON.stringify({ valid: false, reason: 'call_not_found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log access
    const accessLog = share.access_log || [];
    accessLog.push({
      timestamp: new Date().toISOString(),
      ip: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      email: email || null,
    });

    // Update share with new access log and increment view count
    await supabase
      .from('shared_recordings')
      .update({
        access_log: accessLog,
        view_count: share.view_count + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', share.id);

    console.log('[validate-share-access] Access granted successfully');

    // Return success with call log data
    return new Response(
      JSON.stringify({
        valid: true,
        callLog,
        share: {
          allowDownload: share.allow_download,
          expiresAt: share.expires_at,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[validate-share-access] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ valid: false, reason: 'internal_error', error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
