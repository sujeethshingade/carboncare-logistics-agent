import { supabase } from '@/lib/supabase';

export interface SustainabilityAnalytics {
    timestamp: string;
    num_shipments_analyzed: number;
    summary_statistics: any;
    detailed_results: any[];
  }
  

export async function storeAnalyticsData(data: SustainabilityAnalytics) {
  try {
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('sustainability_analytics')
      .insert([
        {
          timestamp: data.timestamp,
          data: data,
          num_shipments: data.num_shipments_analyzed,
          user_id: (await supabase.auth.getUser()).data?.user?.id
        }
      ])
      .select()
      .single();

    if (analyticsError) throw analyticsError;
    return analyticsData;
  } catch (error) {
    console.error('Error storing analytics data:', error);
    throw error;
  }
}

export async function getLatestAnalytics() {
    try {
      const { data, error } = await supabase
        .from('sustainability_analytics')
        .select('*')
        .order('timestamp', { ascending: false })
        .eq('user_id', (await supabase.auth.getUser()).data?.user?.id)
        .limit(1)
        .single();
  
      if (error) throw error;
      return data?.data as SustainabilityAnalytics;
    } catch (error) {
      console.error('Error fetching latest analytics:', error);
      throw error;
    }
  }
  
  export async function getAnalyticsHistory(limit: number = 10) {
    try {
      const { data, error } = await supabase
        .from('sustainability_analytics')
        .select('*')
        .order('timestamp', { ascending: false })
        .eq('user_id', (await supabase.auth.getUser()).data?.user?.id)
        .limit(limit);
  
      if (error) throw error;
      return data.map(record => record.data) as SustainabilityAnalytics[];
    } catch (error) {
      console.error('Error fetching analytics history:', error);
      throw error;
    }
  }