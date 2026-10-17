import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useScans = (page = 1, limit = 12, search = '', prediction = '', agreement = '') => {
  return useQuery({
    queryKey: ['scans', { page, limit, search, prediction, agreement }],
    queryFn: async () => {
      let url = `/scans?page=${page}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (prediction) url += `&prediction=${encodeURIComponent(prediction)}`;
      if (agreement) url += `&agreement=${encodeURIComponent(agreement)}`;

      const res = await api.get(url);
      return res.data;
    },
    staleTime: 20000,
    keepPreviousData: true
  });
};

export const useScanDetail = (id) => {
  return useQuery({
    queryKey: ['scan', id],
    queryFn: async () => {
      const res = await api.get(`/scans/detail/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
    staleTime: 60000
  });
};

export const useUploadScan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData) => {
      const res = await api.post('/scans/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};

export const useDeleteScan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/scans/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};
