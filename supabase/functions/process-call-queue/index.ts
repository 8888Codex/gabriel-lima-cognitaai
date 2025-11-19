import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🚀 Process Call Queue - Iniciando processamento');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    if (!VAPI_API_KEY) {
      console.error('❌ VAPI_API_KEY não configurada');
      throw new Error('VAPI_API_KEY não configurada');
    }

    // 1. Buscar campanhas ativas
    const { data: activeCampaigns, error: campaignError } = await supabase
      .from('call_campaigns')
      .select('*')
      .eq('status', 'active');

    if (campaignError) {
      console.error('❌ Erro ao buscar campanhas:', campaignError);
      throw campaignError;
    }

    console.log(`📋 Encontradas ${activeCampaigns?.length || 0} campanhas ativas`);

    const results = [];

    for (const campaign of activeCampaigns || []) {
      console.log(`\n🎯 Processando campanha: ${campaign.name} (ID: ${campaign.id})`);

      // 2. Verificar janela de horário
      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
      
      if (campaign.start_time && campaign.end_time) {
        if (currentTime < campaign.start_time || currentTime > campaign.end_time) {
          console.log(`⏰ Campanha ${campaign.name} fora do horário de operação (${campaign.start_time} - ${campaign.end_time})`);
          continue;
        }
      }

      // 3. Buscar próximo lote de contatos pendentes
      const { data: queueItems, error: queueError } = await supabase
        .from('call_queue')
        .select('*')
        .eq('campaign_id', campaign.id)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(campaign.batch_size || 10);

      if (queueError) {
        console.error(`❌ Erro ao buscar fila da campanha ${campaign.name}:`, queueError);
        throw queueError;
      }

      if (!queueItems || queueItems.length === 0) {
        console.log(`📭 Sem contatos pendentes para campanha ${campaign.name}`);
        
        // Verificar se deve marcar como completa
        const { count: totalPending } = await supabase
          .from('call_queue')
          .select('id', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .eq('status', 'pending');

        if (totalPending === 0) {
          await supabase
            .from('call_campaigns')
            .update({ 
              status: 'completed',
              completed_at: now.toISOString()
            })
            .eq('id', campaign.id);
          
          console.log(`✅ Campanha ${campaign.name} marcada como completa`);
        }
        
        continue;
      }

      console.log(`📞 Disparando ${queueItems.length} chamadas para campanha ${campaign.name}`);

      // 4. Disparar chamadas
      const dispatchedCalls = [];

      for (const item of queueItems) {
        try {
          console.log(`  📞 Disparando chamada para ${item.customer_phone}`);
          
          // Marcar como "calling"
          await supabase
            .from('call_queue')
            .update({ 
              status: 'calling', 
              dispatched_at: now.toISOString() 
            })
            .eq('id', item.id);

          // Fazer chamada via Vapi
          const callResponse = await fetch('https://api.vapi.ai/call', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${VAPI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              assistantId: item.assistant_id || campaign.assistant_id,
              phoneNumberId: item.phone_number_id || campaign.phone_number_id,
              customer: {
                number: item.customer_phone,
                name: item.customer_name,
              },
              ...(item.initial_message && {
                assistantOverrides: {
                  firstMessage: item.initial_message
                }
              })
            }),
          });

          if (!callResponse.ok) {
            const error = await callResponse.text();
            console.error(`  ❌ Erro Vapi para ${item.customer_phone}:`, error);
            throw new Error(`Vapi error: ${error}`);
          }

          const callData = await callResponse.json();
          console.log(`  ✅ Chamada iniciada: ${callData.id}`);

          // Salvar log da chamada
          const { data: callLog, error: logError } = await supabase
            .from('call_logs')
            .insert({
              vapi_call_id: callData.id,
              status: callData.status || 'queued',
              customer_name: item.customer_name,
              customer_phone: item.customer_phone,
              customer_email: item.customer_email,
              assistant_id: item.assistant_id,
              phone_number_id: item.phone_number_id,
              call_type: 'outbound',
            })
            .select()
            .single();

          if (logError) {
            console.error(`  ❌ Erro ao salvar call_log:`, logError);
            throw logError;
          }

          // Atualizar queue com call_log_id e marcar como completed
          await supabase
            .from('call_queue')
            .update({ 
              call_log_id: callLog.id,
              status: 'completed',
              completed_at: now.toISOString()
            })
            .eq('id', item.id);

          dispatchedCalls.push({ 
            queueId: item.id, 
            callId: callData.id, 
            phone: item.customer_phone,
            name: item.customer_name
          });

        } catch (error: any) {
          console.error(`  ❌ Erro ao disparar chamada para ${item.customer_phone}:`, error);
          
          // Atualizar com erro
          const shouldRetry = item.retry_count < item.max_retries;
          await supabase
            .from('call_queue')
            .update({ 
              status: shouldRetry ? 'pending' : 'failed',
              retry_count: item.retry_count + 1,
              error_message: error.message || 'Erro desconhecido'
            })
            .eq('id', item.id);

          console.log(`  ${shouldRetry ? '🔄 Será retentado' : '💀 Falha definitiva'} (tentativa ${item.retry_count + 1}/${item.max_retries})`);
        }
      }

      // 5. Atualizar contadores da campanha
      if (dispatchedCalls.length > 0) {
        await supabase
          .from('call_campaigns')
          .update({ 
            completed_calls: campaign.completed_calls + dispatchedCalls.length 
          })
          .eq('id', campaign.id);
      }

      results.push({
        campaign: campaign.name,
        campaignId: campaign.id,
        dispatched: dispatchedCalls.length,
        calls: dispatchedCalls,
      });

      console.log(`✅ Campanha ${campaign.name}: ${dispatchedCalls.length} chamadas disparadas`);
    }

    console.log('\n✨ Processamento concluído com sucesso');
    console.log('📊 Resumo:', JSON.stringify(results, null, 2));

    return new Response(
      JSON.stringify({ 
        success: true, 
        timestamp: new Date().toISOString(),
        totalCampaigns: activeCampaigns?.length || 0,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('💥 Erro fatal no processamento da fila:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro desconhecido',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
