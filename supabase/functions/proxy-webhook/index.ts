import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    
    console.log('📨 Proxy recebido payload:', JSON.stringify(payload, null, 2));

    // Get webhook URL from payload or use default
    const webhookUrl = payload.webhookUrl || "https://nwhminds.cognitaai.com.br/webhook/ativacao-carol";
    
    // Get custom headers from payload
    const customHeaders = payload.customHeaders || {};
    
    console.log('🎯 Encaminhando para:', webhookUrl);
    if (Object.keys(customHeaders).length > 0) {
      console.log('🔐 Headers personalizados:', Object.keys(customHeaders).join(', '));
    }

    // Forward request to external webhook with extended timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 seconds timeout

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Lovable-Proxy/1.0',
          ...customHeaders, // Spread custom headers
        },
        body: JSON.stringify({
          contact: payload.contact,
          message: payload.message,
          timestamp: payload.timestamp,
          contactIndex: payload.contactIndex,
          totalContacts: payload.totalContacts,
          retryAttempt: payload.retryAttempt || 0,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`📥 Resposta do webhook - Status: ${response.status} ${response.statusText}`);
      
      // Try to read response body
      let responseBody = null;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          responseBody = await response.json();
        } else {
          responseBody = await response.text();
        }
        console.log('📄 Corpo da resposta:', responseBody);
      } catch (e) {
        console.log('⚠️ Não foi possível ler corpo da resposta:', e);
      }

      // Return response to client
      return new Response(
        JSON.stringify({
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          body: responseBody,
          webhookUrl,
        }),
        {
          status: response.ok ? 200 : response.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('⏱️ Timeout ao conectar com webhook');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Timeout ao conectar com o webhook após 25 segundos',
            webhookUrl,
          }),
          {
            status: 504,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      console.error('❌ Erro ao conectar com webhook:', fetchError);
      return new Response(
        JSON.stringify({
          success: false,
          error: fetchError.message || 'Erro ao conectar com o webhook',
          errorType: fetchError.name,
          webhookUrl,
        }),
        {
          status: 502,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

  } catch (error: any) {
    console.error('❌ Erro no proxy:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro interno no proxy',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
