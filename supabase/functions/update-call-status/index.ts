import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateCallPayload {
  vapi_call_id: string;
  status?: string;
  transcript?: string;
  recording_url?: string;
  duration?: number;
  ended_at?: string;
  sentiment?: string;
  customer_satisfaction?: string;
  analysis_success_evaluation?: string;
  analysis_summary?: string;
  analysis_structured_data?: any;
  error_message?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📞 Update Call Status - Recebendo requisição do n8n');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const payload: UpdateCallPayload = await req.json();
    console.log('📋 Payload recebido:', JSON.stringify(payload, null, 2));

    // Validate required field
    if (!payload.vapi_call_id) {
      console.error('❌ Erro: vapi_call_id é obrigatório');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'vapi_call_id é obrigatório' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Build update object with only provided fields
    const updateData: any = {};
    
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.transcript !== undefined) updateData.transcript = payload.transcript;
    if (payload.recording_url !== undefined) updateData.recording_url = payload.recording_url;
    if (payload.duration !== undefined) updateData.duration = payload.duration;
    if (payload.ended_at !== undefined) updateData.ended_at = payload.ended_at;
    if (payload.sentiment !== undefined) updateData.sentiment = payload.sentiment;
    if (payload.customer_satisfaction !== undefined) updateData.customer_satisfaction = payload.customer_satisfaction;
    if (payload.analysis_success_evaluation !== undefined) updateData.analysis_success_evaluation = payload.analysis_success_evaluation;
    if (payload.analysis_summary !== undefined) updateData.analysis_summary = payload.analysis_summary;
    if (payload.analysis_structured_data !== undefined) updateData.analysis_structured_data = payload.analysis_structured_data;
    if (payload.error_message !== undefined) updateData.error_message = payload.error_message;

    console.log('🔄 Atualizando call_logs para vapi_call_id:', payload.vapi_call_id);
    console.log('📝 Dados a atualizar:', JSON.stringify(updateData, null, 2));

    // Update call_logs
    const { data, error } = await supabase
      .from('call_logs')
      .update(updateData)
      .eq('vapi_call_id', payload.vapi_call_id)
      .select();

    if (error) {
      console.error('❌ Erro ao atualizar call_logs:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ Nenhum registro encontrado com vapi_call_id:', payload.vapi_call_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Call log não encontrado' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Call log atualizado com sucesso:', data[0].id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: data[0],
        message: 'Call log atualizado com sucesso'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
