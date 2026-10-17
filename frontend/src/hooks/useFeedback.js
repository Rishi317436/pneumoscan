import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useFeedback = () => {
  return useQuery({
    queryKey: ['feedbacks'],
    queryFn: async () => {
      const res = await api.get('/feedback');
      return res.data;
    },
    staleTime: 30000
  });
};

export const useSubmitFeedback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedbackData) => {
      const res = await api.post('/feedback', feedbackData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
    }
  });
};

export const useDeleteFeedback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/feedback/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
    }
  });
};
