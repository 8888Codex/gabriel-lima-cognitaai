-- Create call_logs table for storing all call history
CREATE TABLE public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Call information
  vapi_call_id TEXT NOT NULL UNIQUE,
  call_type TEXT CHECK (call_type IN ('inbound', 'outbound')) DEFAULT 'outbound',
  status TEXT CHECK (status IN ('scheduled', 'queued', 'ringing', 'in-progress', 'ended', 'failed')),
  
  -- Customer information
  customer_name TEXT,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  
  -- Timestamps
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- in seconds
  
  -- Call analysis
  analysis_summary TEXT,
  analysis_structured_data JSONB,
  analysis_success_evaluation TEXT,
  
  -- Sentiment (extracted from structured_data)
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  customer_satisfaction TEXT,
  
  -- Metadata
  assistant_id TEXT,
  phone_number_id TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Full transcript
  transcript TEXT
);

-- Create indexes for fast queries
CREATE INDEX idx_call_logs_customer_phone ON public.call_logs(customer_phone);
CREATE INDEX idx_call_logs_created_at ON public.call_logs(created_at DESC);
CREATE INDEX idx_call_logs_status ON public.call_logs(status);
CREATE INDEX idx_call_logs_sentiment ON public.call_logs(sentiment);
CREATE INDEX idx_call_logs_vapi_call_id ON public.call_logs(vapi_call_id);

-- Enable Row Level Security
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (simplify for development)
CREATE POLICY "Allow public read access" ON public.call_logs
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON public.call_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON public.call_logs
  FOR UPDATE USING (true);