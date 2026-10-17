import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const useDashboard = () => {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/dashboard/stats');
      return res.data;
    },
    staleTime: 30000,
    refetchOnWindowFocus: true
  });
};
