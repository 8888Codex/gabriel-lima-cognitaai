import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Campaign {
  id: string;
  created_at: string;
  name: string;
  description?: string;
  batch_size: number;
  interval_minutes: number;
  start_time?: string;
  end_time?: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  total_contacts: number;
  completed_calls: number;
  started_at?: string;
  completed_at?: string;
}

export interface QueueContact {
  customer_name?: string;
  customer_phone: string;
  customer_email?: string;
  assistant_id: string;
  phone_number_id: string;
  priority?: number;
}

export const useCampaigns = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const createCampaign = async (campaign: Omit<Campaign, 'id' | 'created_at' | 'total_contacts' | 'completed_calls' | 'started_at' | 'completed_at'>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('call_campaigns')
        .insert({
          name: campaign.name,
          description: campaign.description,
          batch_size: campaign.batch_size,
          interval_minutes: campaign.interval_minutes,
          start_time: campaign.start_time,
          end_time: campaign.end_time,
          status: campaign.status,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Campanha criada!",
        description: `A campanha "${campaign.name}" foi criada com sucesso.`,
      });

      return data;
    } catch (error: any) {
      console.error('Erro ao criar campanha:', error);
      toast({
        title: "Erro ao criar campanha",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getCampaigns = async (status?: Campaign['status']) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('call_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Campaign[];
    } catch (error: any) {
      console.error('Erro ao buscar campanhas:', error);
      toast({
        title: "Erro ao buscar campanhas",
        description: error.message,
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('call_campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Campanha atualizada!",
        description: "As alterações foram salvas com sucesso.",
      });

      return data;
    } catch (error: any) {
      console.error('Erro ao atualizar campanha:', error);
      toast({
        title: "Erro ao atualizar campanha",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const startCampaign = async (id: string) => {
    return updateCampaign(id, { 
      status: 'active',
      started_at: new Date().toISOString()
    });
  };

  const pauseCampaign = async (id: string) => {
    return updateCampaign(id, { status: 'paused' });
  };

  const cancelCampaign = async (id: string) => {
    return updateCampaign(id, { status: 'cancelled' });
  };

  const addContactsToQueue = async (campaignId: string, contacts: QueueContact[]) => {
    setIsLoading(true);
    try {
      // Adicionar campaign_id a cada contato
      const queueItems = contacts.map(contact => ({
        ...contact,
        campaign_id: campaignId,
        status: 'pending',
      }));

      const { data, error } = await supabase
        .from('call_queue')
        .insert(queueItems)
        .select();

      if (error) throw error;

      // Buscar campanha atual e incrementar total_contacts
      const { data: campaign } = await supabase
        .from('call_campaigns')
        .select('total_contacts')
        .eq('id', campaignId)
        .single();

      if (campaign) {
        await supabase
          .from('call_campaigns')
          .update({ 
            total_contacts: campaign.total_contacts + contacts.length
          })
          .eq('id', campaignId);
      }

      toast({
        title: "Contatos adicionados!",
        description: `${contacts.length} contatos foram adicionados à fila.`,
      });

      return data;
    } catch (error: any) {
      console.error('Erro ao adicionar contatos:', error);
      toast({
        title: "Erro ao adicionar contatos",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getQueueStats = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('call_queue')
        .select('status', { count: 'exact' })
        .eq('campaign_id', campaignId);

      if (error) throw error;

      const stats = {
        pending: 0,
        calling: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        total: data?.length || 0,
      };

      data?.forEach((item: any) => {
        stats[item.status as keyof typeof stats]++;
      });

      return stats;
    } catch (error: any) {
      console.error('Erro ao buscar estatísticas da fila:', error);
      return null;
    }
  };

  return {
    isLoading,
    createCampaign,
    getCampaigns,
    updateCampaign,
    startCampaign,
    pauseCampaign,
    cancelCampaign,
    addContactsToQueue,
    getQueueStats,
  };
};
