-- Add recording_url field to call_logs table
ALTER TABLE public.call_logs 
ADD COLUMN recording_url TEXT;

-- Create index for faster queries
CREATE INDEX idx_call_logs_recording_url ON public.call_logs(recording_url) 
WHERE recording_url IS NOT NULL;