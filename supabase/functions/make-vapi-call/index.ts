import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, assistantId, phoneNumberId } = await req.json();
    
    if (!phoneNumber || !assistantId || !phoneNumberId) {
      throw new Error('Missing required fields: phoneNumber, assistantId, or phoneNumberId');
    }

    const VAPI_PRIVATE_KEY = Deno.env.get('VAPI_PRIVATE_KEY');
    if (!VAPI_PRIVATE_KEY) {
      throw new Error('VAPI_PRIVATE_KEY not configured in backend');
    }

    console.log('🚀 Making outbound call to:', phoneNumber);

    // Fazer chamada à Vapi API com Private Key
    const response = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId,
        phoneNumberId,
        customer: {
          number: phoneNumber,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Vapi API error:', response.status, errorText);
      throw new Error(`Vapi API error (${response.status}): ${errorText}`);
    }

    const callData = await response.json();
    console.log('✅ Call created successfully:', callData.id);

    return new Response(
      JSON.stringify(callData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('💥 Error in make-vapi-call:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
