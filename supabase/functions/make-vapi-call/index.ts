import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // GET request - health check, call status, or assistant validation
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const callId = url.searchParams.get('callId');
    const assistantId = url.searchParams.get('assistantId');
    
    const VAPI_PRIVATE_KEY = Deno.env.get('VAPI_PRIVATE_KEY');
    
    if (!VAPI_PRIVATE_KEY) {
      return new Response(
        JSON.stringify({ 
          status: 'error',
          error: 'VAPI_PRIVATE_KEY not configured in backend',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // If assistantId provided, validate it exists
    if (assistantId) {
      console.log('🔍 Validating assistant:', assistantId);
      
      try {
        const response = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            return new Response(
              JSON.stringify({ 
                exists: false,
                error: `Assistant ID ${assistantId} não existe na sua conta Vapi.`,
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
              }
            );
          }
          
          const errorText = await response.text();
          console.error('❌ Error validating assistant:', response.status, errorText);
          return new Response(
            JSON.stringify({ 
              error: `Erro ao validar assistant: ${response.status}`,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: response.status,
            }
          );
        }

        const assistantData = await response.json();
        console.log('✅ Assistant exists:', assistantData.name);
        
        return new Response(
          JSON.stringify({ 
            exists: true,
            assistant: {
              id: assistantData.id,
              name: assistantData.name,
            },
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } catch (error) {
        console.error('💥 Error validating assistant:', error);
        return new Response(
          JSON.stringify({ 
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    }

    // If callId provided, get call status
    if (callId) {
      console.log('📊 Fetching call status for:', callId);
      
      try {
        const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Error fetching call status:', response.status, errorText);
          return new Response(
            JSON.stringify({ 
              error: `Failed to get call status: ${response.status}`,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: response.status,
            }
          );
        }

        const callData = await response.json();
        console.log('✅ Call status:', callData.status);
        
        return new Response(
          JSON.stringify(callData),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } catch (error) {
        console.error('💥 Error getting call status:', error);
        return new Response(
          JSON.stringify({ 
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    }

    // Health check - test the key by calling Vapi API to list assistants
    try {
      const response = await fetch('https://api.vapi.ai/assistant', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Vapi API auth error:', response.status, errorText);
        return new Response(
          JSON.stringify({ 
            status: 'error',
            error: `Invalid VAPI_PRIVATE_KEY: ${response.status}`,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          status: 'ok',
          message: 'VAPI_PRIVATE_KEY is configured and valid',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (error) {
      console.error('💥 Error testing Vapi credentials:', error);
      return new Response(
        JSON.stringify({ 
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  }

  // POST request - make actual call
  try {
    const { phoneNumber, assistantId, phoneNumberId } = await req.json();
    
    if (!phoneNumber || !assistantId || !phoneNumberId) {
      throw new Error('Missing required fields: phoneNumber, assistantId, or phoneNumberId');
    }

    // Validate E.164 format
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(phoneNumber)) {
      throw new Error(`Invalid phone number format. Must be E.164 format (e.g., +15551234567). Received: ${phoneNumber}`);
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
      
      let errorMessage = `Vapi API error (${response.status})`;
      
      // Try to parse error details
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          errorMessage = Array.isArray(errorJson.message) 
            ? errorJson.message.join(', ') 
            : errorJson.message;
        }
      } catch {
        errorMessage = errorText;
      }
      
      throw new Error(errorMessage);
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
