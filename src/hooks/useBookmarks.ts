import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Bookmark {
  id: string;
  call_log_id: string;
  timestamp: number;
  label: string;
  description?: string;
  category?: string;
  color?: string;
  is_auto_generated?: boolean;
  created_by?: string;
  created_at?: string;
}

export const useBookmarks = (callLogId: string) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar bookmarks
  const fetchBookmarks = async () => {
    try {
      const { data, error } = await supabase
        .from('audio_bookmarks')
        .select('*')
        .eq('call_log_id', callLogId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      setBookmarks(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar bookmarks:', error);
      toast.error('Erro ao carregar marcadores');
    }
  };

  // Adicionar bookmark manual
  const addBookmark = async (timestamp: number, label: string, description?: string, category?: string, color?: string) => {
    try {
      const { data, error } = await supabase
        .from('audio_bookmarks')
        .insert({
          call_log_id: callLogId,
          timestamp,
          label,
          description,
          category,
          color: color || '#ef4444',
          is_auto_generated: false,
          created_by: 'user'
        })
        .select()
        .single();

      if (error) throw error;
      
      setBookmarks(prev => [...prev, data].sort((a, b) => a.timestamp - b.timestamp));
      toast.success('Marcador adicionado!');
      return data;
    } catch (error: any) {
      console.error('Erro ao adicionar bookmark:', error);
      toast.error('Erro ao adicionar marcador');
      throw error;
    }
  };

  // Atualizar bookmark
  const updateBookmark = async (bookmarkId: string, updates: Partial<Bookmark>) => {
    try {
      const { data, error } = await supabase
        .from('audio_bookmarks')
        .update(updates)
        .eq('id', bookmarkId)
        .select()
        .single();

      if (error) throw error;

      setBookmarks(prev => 
        prev.map(b => b.id === bookmarkId ? data : b)
      );
      toast.success('Marcador atualizado!');
    } catch (error: any) {
      console.error('Erro ao atualizar bookmark:', error);
      toast.error('Erro ao atualizar marcador');
    }
  };

  // Deletar bookmark
  const deleteBookmark = async (bookmarkId: string) => {
    try {
      const { error } = await supabase
        .from('audio_bookmarks')
        .delete()
        .eq('id', bookmarkId);

      if (error) throw error;

      setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
      toast.success('Marcador removido!');
    } catch (error: any) {
      console.error('Erro ao deletar bookmark:', error);
      toast.error('Erro ao deletar marcador');
    }
  };

  // Gerar bookmarks automáticos via IA
  const generateAutoBookmarks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-bookmarks', {
        body: { callLogId }
      });

      if (error) throw error;

      toast.success(`${data.bookmarks.length} marcadores automáticos criados!`);
      await fetchBookmarks();
    } catch (error: any) {
      console.error('Erro ao gerar bookmarks:', error);
      toast.error('Erro ao gerar marcadores automáticos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (callLogId) {
      fetchBookmarks();
    }
  }, [callLogId]);

  return {
    bookmarks,
    isLoading,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    generateAutoBookmarks,
    refetch: fetchBookmarks
  };
};
