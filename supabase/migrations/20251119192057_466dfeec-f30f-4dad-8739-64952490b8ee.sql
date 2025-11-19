-- Adicionar credenciais Vapi na tabela call_campaigns
ALTER TABLE call_campaigns 
ADD COLUMN assistant_id TEXT,
ADD COLUMN phone_number_id TEXT;

-- Adicionar campo de mensagem inicial na call_queue
ALTER TABLE call_queue 
ADD COLUMN initial_message TEXT;

-- Tornar assistant_id e phone_number_id opcionais na call_queue
-- (agora virão da campanha)
ALTER TABLE call_queue 
ALTER COLUMN assistant_id DROP NOT NULL,
ALTER COLUMN phone_number_id DROP NOT NULL;