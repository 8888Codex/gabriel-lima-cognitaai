import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Json = Database['public']['Tables']['shared_recordings']['Row']['access_log'];

export interface CreateShareOptions {
  callLogId: string;
  expiresAt: Date;
  requirePassword?: boolean;
  password?: string;
  maxViews?: number;
  allowDownload?: boolean;
  allowedEmails?: string[];
}

export interface SharedRecording {
  id: string;
  call_log_id: string;
  share_token: string;
  expires_at: string;
  is_active: boolean;
  require_password: boolean;
  password_hash: string | null;
  view_count: number;
  max_views: number | null;
  allow_download: boolean;
  allowed_emails: string[] | null;
  created_at: string;
  last_accessed_at: string | null;
  access_log: Json;
  revoked_at: string | null;
}

export const useSharedRecordings = () => {
  const { toast } = useToast();

  const createShare = async (options: CreateShareOptions): Promise<SharedRecording | null> => {
    try {
      const shareToken = crypto.randomUUID();
      
      // If password is required, we'll hash it on the server side
      const insertData: any = {
        call_log_id: options.callLogId,
        share_token: shareToken,
        expires_at: options.expiresAt.toISOString(),
        require_password: options.requirePassword || false,
        password_hash: options.password || null, // Will be hashed by edge function if provided
        max_views: options.maxViews || null,
        allow_download: options.allowDownload || false,
        allowed_emails: options.allowedEmails || null,
        is_active: true,
      };

      const { data, error } = await supabase
        .from('shared_recordings')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Link criado com sucesso",
        description: "O link de compartilhamento foi gerado.",
      });

      return data;
    } catch (error: any) {
      console.error('Error creating share:', error);
      toast({
        title: "Erro ao criar compartilhamento",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const listShares = async (callLogId: string): Promise<SharedRecording[]> => {
    try {
      const { data, error } = await supabase
        .from('shared_recordings')
        .select('*')
        .eq('call_log_id', callLogId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error listing shares:', error);
      toast({
        title: "Erro ao listar compartilhamentos",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }
  };

  const revokeShare = async (shareId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('shared_recordings')
        .update({ 
          is_active: false,
          revoked_at: new Date().toISOString()
        })
        .eq('id', shareId);

      if (error) throw error;

      toast({
        title: "Compartilhamento revogado",
        description: "O link foi desativado com sucesso.",
      });

      return true;
    } catch (error: any) {
      console.error('Error revoking share:', error);
      toast({
        title: "Erro ao revogar compartilhamento",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const updateShare = async (
    shareId: string, 
    updates: Partial<CreateShareOptions>
  ): Promise<boolean> => {
    try {
      const updateData: any = {};
      
      if (updates.expiresAt) updateData.expires_at = updates.expiresAt.toISOString();
      if (updates.maxViews !== undefined) updateData.max_views = updates.maxViews;
      if (updates.allowDownload !== undefined) updateData.allow_download = updates.allowDownload;
      if (updates.allowedEmails !== undefined) updateData.allowed_emails = updates.allowedEmails;

      const { error } = await supabase
        .from('shared_recordings')
        .update(updateData)
        .eq('id', shareId);

      if (error) throw error;

      toast({
        title: "Compartilhamento atualizado",
        description: "As configurações foram salvas.",
      });

      return true;
    } catch (error: any) {
      console.error('Error updating share:', error);
      toast({
        title: "Erro ao atualizar compartilhamento",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const logAccess = async (shareId: string, accessData: any): Promise<boolean> => {
    try {
      // Get current share
      const { data: share, error: fetchError } = await supabase
        .from('shared_recordings')
        .select('access_log, view_count')
        .eq('id', shareId)
        .single();

      if (fetchError) throw fetchError;

      const currentLog = Array.isArray(share.access_log) ? share.access_log : [];
      const newLog = [...currentLog, accessData];

      const { error } = await supabase
        .from('shared_recordings')
        .update({ 
          access_log: newLog,
          view_count: (share.view_count || 0) + 1,
          last_accessed_at: new Date().toISOString()
        })
        .eq('id', shareId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error logging access:', error);
      return false;
    }
  };

  const getShareByToken = async (token: string): Promise<SharedRecording | null> => {
    try {
      const { data, error } = await supabase
        .from('shared_recordings')
        .select('*')
        .eq('share_token', token)
        .single();

      if (error) throw error;
      return data as SharedRecording;
    } catch (error: any) {
      console.error('Error getting share by token:', error);
      return null;
    }
  };

  return {
    createShare,
    listShares,
    revokeShare,
    updateShare,
    logAccess,
    getShareByToken,
  };
};
