import { supabase } from "@/integrations/supabase/client";
import { OutboundCall } from "@/types/outbound";

export interface CallLogFilters {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  sentiment?: string;
  searchTerm?: string;
  minDuration?: number;
  maxDuration?: number;
  page?: number;
  pageSize?: number;
}

export interface CallStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  successRate: number;
  averageDuration: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

// Helper to extract sentiment from structured data
const extractSentiment = (structuredData?: any): string | null => {
  if (!structuredData) return null;
  return structuredData.sentiment || 
         structuredData.customerSentiment || 
         structuredData.overallSentiment || 
         null;
};

// Helper to extract customer satisfaction
const extractSatisfaction = (structuredData?: any): string | null => {
  if (!structuredData) return null;
  return structuredData.customerSatisfaction || 
         structuredData.satisfaction || 
         null;
};

export const useCallLogs = () => {
  const saveCallLog = async (call: Partial<OutboundCall> & { recordingUrl?: string }) => {
    try {
      const insertData: any = {
        vapi_call_id: call.id!,
        status: call.status || 'queued',
        customer_name: call.customer?.name || null,
        customer_phone: call.customer?.number || 'N/A',
        scheduled_at: call.scheduledAt?.toISOString() || null,
        started_at: call.startedAt?.toISOString() || null,
        ended_at: call.endedAt?.toISOString() || null,
        duration: call.duration || null,
        analysis_summary: call.analysis?.summary || null,
        analysis_structured_data: call.analysis?.structuredData || null,
        analysis_success_evaluation: call.analysis?.successEvaluation?.toString() || null,
        sentiment: extractSentiment(call.analysis?.structuredData),
        customer_satisfaction: extractSatisfaction(call.analysis?.structuredData),
        error_message: call.error || null,
        retry_count: call.retryCount || 0,
        recording_url: call.recordingUrl || null,
      };

      const { data, error } = await supabase
        .from('call_logs')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[useCallLogs] Error saving call log:', error);
      throw error;
    }
  };

  const updateCallLog = async (vapiCallId: string, updates: Partial<OutboundCall> & { recordingUrl?: string }) => {
    try {
      const updateData: any = {};
      
      if (updates.status) updateData.status = updates.status;
      if (updates.startedAt) updateData.started_at = updates.startedAt.toISOString();
      if (updates.endedAt) updateData.ended_at = updates.endedAt.toISOString();
      if (updates.duration !== undefined) updateData.duration = updates.duration;
      if (updates.error) updateData.error_message = updates.error;
      if (updates.recordingUrl !== undefined) updateData.recording_url = updates.recordingUrl;
      
      if (updates.analysis) {
        updateData.analysis_summary = updates.analysis.summary || null;
        updateData.analysis_structured_data = updates.analysis.structuredData || null;
        updateData.analysis_success_evaluation = updates.analysis.successEvaluation?.toString() || null;
        updateData.sentiment = extractSentiment(updates.analysis.structuredData);
        updateData.customer_satisfaction = extractSatisfaction(updates.analysis.structuredData);
      }

      const { data, error } = await supabase
        .from('call_logs')
        .update(updateData)
        .eq('vapi_call_id', vapiCallId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[useCallLogs] Error updating call log:', error);
      throw error;
    }
  };

  const getCallLogs = async (filters: CallLogFilters = {}) => {
    try {
      let query = supabase
        .from('call_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.sentiment) {
        query = query.eq('sentiment', filters.sentiment);
      }
      if (filters.searchTerm) {
        query = query.or(`customer_name.ilike.%${filters.searchTerm}%,customer_phone.ilike.%${filters.searchTerm}%`);
      }
      if (filters.minDuration !== undefined) {
        query = query.gte('duration', filters.minDuration);
      }
      if (filters.maxDuration !== undefined) {
        query = query.lte('duration', filters.maxDuration);
      }

      // Pagination
      const page = filters.page || 1;
      const pageSize = filters.pageSize || 20;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        calls: data || [],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    } catch (error) {
      console.error('[useCallLogs] Error fetching call logs:', error);
      throw error;
    }
  };

  const getCallStats = async (period: 'today' | '7days' | '30days' | 'all' = 'all'): Promise<CallStats> => {
    try {
      let query = supabase
        .from('call_logs')
        .select('status, duration, sentiment, error_message');

      // Filter by period
      if (period !== 'all') {
        const now = new Date();
        const startDate = new Date();
        if (period === 'today') startDate.setHours(0, 0, 0, 0);
        if (period === '7days') startDate.setDate(now.getDate() - 7);
        if (period === '30days') startDate.setDate(now.getDate() - 30);
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const totalCalls = data?.length || 0;
      const successfulCalls = data?.filter(c => c.status === 'ended' && !c.error_message).length || 0;
      const failedCalls = data?.filter(c => c.error_message || c.status === 'failed').length || 0;
      const avgDuration = totalCalls > 0 
        ? data?.reduce((sum, c) => sum + (c.duration || 0), 0) / totalCalls 
        : 0;

      const sentimentCounts = {
        positive: data?.filter(c => c.sentiment === 'positive').length || 0,
        neutral: data?.filter(c => c.sentiment === 'neutral').length || 0,
        negative: data?.filter(c => c.sentiment === 'negative').length || 0,
      };

      return {
        totalCalls,
        successfulCalls,
        failedCalls,
        successRate: totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0,
        averageDuration: avgDuration,
        sentimentDistribution: sentimentCounts,
      };
    } catch (error) {
      console.error('[useCallLogs] Error fetching call stats:', error);
      throw error;
    }
  };

  return {
    saveCallLog,
    updateCallLog,
    getCallLogs,
    getCallStats,
  };
};
