import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

  console.log('🎯 Generate Bookmarks - Iniciando geração automática');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const { callLogId } = await req.json();

    if (!callLogId) {
      throw new Error('callLogId é obrigatório');
    }

    console.log(`📞 Processando chamada: ${callLogId}`);

    // 1. Buscar transcrição
    const { data: transcript, error: transcriptError } = await supabase
      .from('call_transcripts')
      .select('full_text, segments, duration')
      .eq('call_log_id', callLogId)
      .eq('status', 'completed')
      .single();

    if (transcriptError || !transcript) {
      throw new Error('Transcrição não encontrada ou ainda processando');
    }

    console.log('📝 Transcrição encontrada, analisando com IA...');

    // 2. Analisar com IA para identificar momentos importantes
    const prompt = `Analise esta transcrição de atendimento telefônico e identifique os 5-8 momentos mais importantes.

Transcrição:
${transcript.full_text}

Segmentos com timestamps:
${JSON.stringify(transcript.segments, null, 2)}

Para cada momento importante, identifique:
1. O timestamp exato (em segundos)
2. Uma label curta e descritiva (máx 30 chars)
3. Uma descrição breve do que acontece (máx 100 chars)
4. Uma categoria: "inicio" | "problema" | "solucao" | "objecao" | "acordo" | "conclusao" | "outro"
5. Uma cor representativa em hex

Responda APENAS com um array JSON no formato:
[
  {
    "timestamp": 15.5,
    "label": "Cliente descreve problema",
    "description": "Cliente explica que não consegue acessar o sistema",
    "category": "problema",
    "color": "#ef4444"
  }
]

Não adicione nenhum texto antes ou depois do JSON.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um especialista em análise de atendimentos telefônicos.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erro na API OpenAI:', error);
      throw new Error(`OpenAI API error: ${error}`);
    }

    const aiData = await response.json();
    const content = aiData.choices[0].message.content.trim();
    
    // Extrair JSON da resposta
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('IA não retornou JSON válido');
    }

    const suggestedBookmarks = JSON.parse(jsonMatch[0]);
    console.log(`✨ IA identificou ${suggestedBookmarks.length} momentos importantes`);

    // 3. Inserir bookmarks no banco
    const bookmarksToInsert = suggestedBookmarks.map((b: any) => ({
      call_log_id: callLogId,
      timestamp: b.timestamp,
      label: b.label,
      description: b.description,
      category: b.category,
      color: b.color || '#3b82f6',
      is_auto_generated: true,
      created_by: 'ai',
    }));

    const { data: insertedBookmarks, error: insertError } = await supabase
      .from('audio_bookmarks')
      .insert(bookmarksToInsert)
      .select();

    if (insertError) {
      console.error('❌ Erro ao inserir bookmarks:', insertError);
      throw insertError;
    }

    console.log(`💾 ${insertedBookmarks.length} bookmarks salvos com sucesso!`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        bookmarks: insertedBookmarks,
        count: insertedBookmarks.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('💥 Erro ao gerar bookmarks:', error);

    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
