import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const useComparison = () => {
  return useQuery({
    queryKey: ['comparison'],
    queryFn: async () => {
      const res = await api.get('/comparison');
      return res.data;
    },
    staleTime: 60000
  });
};
