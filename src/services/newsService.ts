import { supabase } from "./supabase";

export const newsService = {
  getIFNews: async () => {
    try {
      const { data, error } = await supabase
        .from('noticias_ia')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data;
    } catch (error) {
      return [];
    }
  }
};