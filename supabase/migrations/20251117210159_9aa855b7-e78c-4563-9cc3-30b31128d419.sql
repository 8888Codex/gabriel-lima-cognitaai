-- Tabela para fila de chamadas
CREATE TABLE public.call_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Dados do contato
  customer_name TEXT,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  
  -- Configuração da chamada
  assistant_id TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  
  -- Status da fila
  status TEXT CHECK (status IN ('pending', 'scheduled', 'calling', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  
  -- Agendamento
  scheduled_for TIMESTAMP WITH TIME ZONE,
  dispatched_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Campanha
  campaign_id UUID,
  
  -- Tentativas
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  
  -- Link com call_log
  call_log_id UUID REFERENCES public.call_logs(id)
);

-- Tabela para campanhas
CREATE TABLE public.call_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Configurações de disparo
  batch_size INTEGER DEFAULT 10,
  interval_minutes INTEGER DEFAULT 2,
  
  -- Janela de operação
  start_time TIME,
  end_time TIME,
  
  -- Status
  status TEXT CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')) DEFAULT 'draft',
  
  -- Contadores
  total_contacts INTEGER DEFAULT 0,
  completed_calls INTEGER DEFAULT 0,
  
  -- Datas
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Adicionar foreign key após criação das tabelas
ALTER TABLE public.call_queue 
ADD CONSTRAINT fk_campaign 
FOREIGN KEY (campaign_id) 
REFERENCES public.call_campaigns(id);

-- Tabela para transcrições
CREATE TABLE public.call_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  call_log_id UUID REFERENCES public.call_logs(id) NOT NULL,
  
  -- Transcrição completa
  full_text TEXT,
  
  -- Segmentos com timestamps
  segments JSONB,
  
  -- Metadados
  language TEXT DEFAULT 'pt',
  duration FLOAT,
  word_count INTEGER,
  
  -- Status
  status TEXT CHECK (status IN ('processing', 'completed', 'failed')) DEFAULT 'processing',
  error_message TEXT,
  
  -- Análise adicional
  keywords JSONB,
  sentiment_by_segment JSONB
);

-- Tabela para bookmarks de áudio
CREATE TABLE public.audio_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  call_log_id UUID REFERENCES public.call_logs(id) NOT NULL,
  
  -- Posição no áudio
  timestamp FLOAT NOT NULL,
  
  -- Informações do marcador
  label TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#ef4444',
  
  -- Categoria
  category TEXT CHECK (category IN ('important', 'objection', 'question', 'positive', 'negative', 'custom')),
  
  -- Criado por (manual ou automático)
  created_by TEXT DEFAULT 'user',
  is_auto_generated BOOLEAN DEFAULT false,
  
  -- Dados adicionais
  metadata JSONB
);

-- Tabela para compartilhamentos
CREATE TABLE public.shared_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  call_log_id UUID REFERENCES public.call_logs(id) NOT NULL,
  
  -- Token único para o link
  share_token TEXT UNIQUE NOT NULL,
  
  -- Configurações de acesso
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  max_views INTEGER,
  view_count INTEGER DEFAULT 0,
  
  -- Permissões
  allow_download BOOLEAN DEFAULT false,
  require_password BOOLEAN DEFAULT false,
  password_hash TEXT,
  
  -- Restrições
  allowed_emails TEXT[],
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMP WITH TIME ZONE,
  
  -- Auditoria
  created_by TEXT,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  access_log JSONB
);

-- Índices para performance
CREATE INDEX idx_call_queue_status ON public.call_queue(status);
CREATE INDEX idx_call_queue_scheduled_for ON public.call_queue(scheduled_for);
CREATE INDEX idx_call_queue_campaign ON public.call_queue(campaign_id);
CREATE INDEX idx_call_campaigns_status ON public.call_campaigns(status);

CREATE INDEX idx_transcripts_call_log ON public.call_transcripts(call_log_id);
CREATE INDEX idx_transcripts_status ON public.call_transcripts(status);

CREATE INDEX idx_bookmarks_call_log ON public.audio_bookmarks(call_log_id);
CREATE INDEX idx_bookmarks_timestamp ON public.audio_bookmarks(timestamp);

CREATE INDEX idx_shared_recordings_token ON public.shared_recordings(share_token);
CREATE INDEX idx_shared_recordings_expires ON public.shared_recordings(expires_at);
CREATE INDEX idx_shared_recordings_call_log ON public.shared_recordings(call_log_id);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.call_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_recordings ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público (ajustar conforme necessidade de autenticação futura)
CREATE POLICY "Allow public read access" ON public.call_queue FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.call_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.call_queue FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON public.call_campaigns FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.call_campaigns FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.call_campaigns FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON public.call_transcripts FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.call_transcripts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.call_transcripts FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON public.audio_bookmarks FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.audio_bookmarks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.audio_bookmarks FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.audio_bookmarks FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.shared_recordings FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.shared_recordings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.shared_recordings FOR UPDATE USING (true);