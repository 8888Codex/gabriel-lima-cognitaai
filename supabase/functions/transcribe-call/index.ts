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

  console.log('🎙️ Transcribe Call - Iniciando transcrição');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY não configurada');
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const { callLogId, audioUrl } = await req.json();

    if (!callLogId || !audioUrl) {
      throw new Error('callLogId e audioUrl são obrigatórios');
    }

    console.log(`📞 Processando chamada: ${callLogId}`);
    console.log(`🔗 URL do áudio: ${audioUrl}`);

    // 1. Criar registro de transcrição em processamento
    const { error: insertError } = await supabase
      .from('call_transcripts')
      .insert({
        call_log_id: callLogId,
        status: 'processing',
      });

    if (insertError) {
      console.error('❌ Erro ao criar registro de transcrição:', insertError);
    }

    // 2. Baixar áudio
    console.log('⬇️ Baixando áudio...');
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Erro ao baixar áudio: ${audioResponse.statusText}`);
    }
    
    const audioBlob = await audioResponse.blob();
    console.log(`✅ Áudio baixado: ${audioBlob.size} bytes`);

    // 3. Transcrever com Whisper (com timestamps detalhados)
    console.log('🎯 Transcrevendo com Whisper...');
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');

    const transcriptResponse = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      }
    );

    if (!transcriptResponse.ok) {
      const error = await transcriptResponse.text();
      console.error('❌ Erro na API Whisper:', error);
      throw new Error(`Whisper API error: ${error}`);
    }

    const transcriptData = await transcriptResponse.json();
    console.log(`✅ Transcrição concluída: ${transcriptData.segments?.length || 0} segmentos`);

    // 4. Processar segmentos com identificação de speaker
    const segments = transcriptData.segments?.map((seg: any) => ({
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
      speaker: identifySpeaker(seg.text),
    })) || [];

    // 5. Extrair keywords
    const keywords = extractKeywords(transcriptData.text);
    console.log(`🔑 Keywords extraídas: ${keywords.join(', ')}`);

    // 6. Análise de sentimento por segmento usando GPT
    console.log('💭 Analisando sentimento...');
    const sentimentBySegment = await analyzeSentimentBySegment(segments, OPENAI_API_KEY);

    // 7. Contar palavras
    const wordCount = transcriptData.text.split(/\s+/).length;

    // 8. Salvar transcrição completa no banco
    console.log('💾 Salvando transcrição no banco...');
    const { data: transcript, error: dbError } = await supabase
      .from('call_transcripts')
      .update({
        full_text: transcriptData.text,
        segments,
        language: transcriptData.language,
        duration: transcriptData.duration,
        word_count: wordCount,
        keywords,
        sentiment_by_segment: sentimentBySegment,
        status: 'completed',
      })
      .eq('call_log_id', callLogId)
      .eq('status', 'processing')
      .select()
      .single();

    if (dbError) {
      console.error('❌ Erro ao salvar transcrição:', dbError);
      throw dbError;
    }

    // 9. Atualizar call_log com transcrição
    await supabase
      .from('call_logs')
      .update({ 
        transcript: transcriptData.text,
        sentiment: calculateOverallSentiment(sentimentBySegment)
      })
      .eq('id', callLogId);

    console.log('✨ Transcrição completa e salva com sucesso!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        transcript,
        segments: segments.length,
        wordCount,
        keywords: keywords.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('💥 Erro na transcrição:', error);

    // Marcar como falha no banco
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { callLogId } = await req.json();
      
      await supabase
        .from('call_transcripts')
        .update({
          status: 'failed',
          error_message: error.message
        })
        .eq('call_log_id', callLogId)
        .eq('status', 'processing');
    } catch (updateError) {
      console.error('Erro ao atualizar status de falha:', updateError);
    }

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

// Helper: Identificar speaker (agent vs customer)
function identifySpeaker(text: string): string {
  const lowerText = text.toLowerCase();
  
  // Padrões típicos de agente
  const agentPhrases = [
    'posso ajudar',
    'obrigado por ligar',
    'vou transferir',
    'meu nome é',
    'como posso',
    'boa tarde',
    'bom dia',
    'bem-vindo',
    'entendo',
    'certo',
    'perfeito'
  ];
  
  // Padrões típicos de cliente
  const customerPhrases = [
    'preciso de',
    'quero',
    'gostaria',
    'tenho um problema',
    'não está funcionando',
    'não consigo'
  ];
  
  const hasAgentPhrase = agentPhrases.some(phrase => lowerText.includes(phrase));
  const hasCustomerPhrase = customerPhrases.some(phrase => lowerText.includes(phrase));
  
  if (hasAgentPhrase && !hasCustomerPhrase) return 'agent';
  if (hasCustomerPhrase && !hasAgentPhrase) return 'customer';
  
  return 'unknown';
}

// Helper: Extrair keywords
function extractKeywords(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  
  const stopWords = [
    'o', 'a', 'de', 'para', 'com', 'em', 'um', 'uma', 'os', 'as',
    'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'ao', 'à',
    'pelo', 'pela', 'que', 'é', 'ser', 'está', 'tem', 'ter', 'por',
    'mais', 'como', 'mas', 'foi', 'são', 'foi', 'esse', 'essa'
  ];
  
  const wordFreq: Record<string, number> = {};
  
  words.forEach(word => {
    const cleaned = word.replace(/[^\w]/g, '');
    if (cleaned.length > 3 && !stopWords.includes(cleaned)) {
      wordFreq[cleaned] = (wordFreq[cleaned] || 0) + 1;
    }
  });
  
  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

// Helper: Análise de sentimento por segmento
async function analyzeSentimentBySegment(
  segments: any[], 
  apiKey: string
): Promise<any[]> {
  if (segments.length === 0) return [];

  const batchSize = 15;
  const results = [];

  for (let i = 0; i < segments.length; i += batchSize) {
    const batch = segments.slice(i, i + batchSize);
    const prompt = `Analise o sentimento (positive/neutral/negative) de cada frase abaixo. Considere o contexto de atendimento ao cliente.

${batch.map((s, idx) => `${idx + 1}. "${s.text}"`).join('\n')}

Responda APENAS com um array JSON no formato: [{"index": 1, "sentiment": "positive", "confidence": 0.95}, ...]
Não adicione nenhum texto adicional antes ou depois do JSON.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        console.error('Erro na análise de sentimento:', await response.text());
        continue;
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      // Extrair JSON da resposta (pode vir com markdown)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const sentiments = JSON.parse(jsonMatch[0]);
        results.push(...sentiments);
      }
    } catch (error) {
      console.error('Erro ao processar sentimento do lote:', error);
    }
  }

  return results;
}

// Helper: Calcular sentimento geral
function calculateOverallSentiment(sentiments: any[]): string {
  if (!sentiments || sentiments.length === 0) return 'neutral';

  const counts = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };

  sentiments.forEach(s => {
    if (s.sentiment in counts) {
      counts[s.sentiment as keyof typeof counts]++;
    }
  });

  const total = sentiments.length;
  const positiveRatio = counts.positive / total;
  const negativeRatio = counts.negative / total;

  if (positiveRatio > 0.6) return 'positive';
  if (negativeRatio > 0.4) return 'negative';
  return 'neutral';
}
