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
    
    console.log('✅ WEBHOOK DE TESTE - Dados recebidos:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📞 Contato:', payload.contact?.name);
    console.log('📱 Telefone:', payload.contact?.phone);
    console.log('📧 Email:', payload.contact?.email);
    console.log('💬 Mensagem:', payload.message);
    console.log('🕐 Timestamp:', payload.timestamp);
    console.log('📊 Progresso:', `${payload.contactIndex}/${payload.totalContacts}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Simular processamento bem-sucedido
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook de teste recebeu os dados com sucesso!',
        received: {
          contact: payload.contact,
          message: payload.message,
          timestamp: new Date().toISOString(),
        }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error: any) {
    console.error('❌ Erro no webhook de teste:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
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
