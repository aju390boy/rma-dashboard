import { useQuery } from '@tanstack/react-query';
import axiosClient from './axiosClient';

export const useAnalytics = () =>
  useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const { data } = await axiosClient.get('/orders/analytics');
      return data.data;
    },
    staleTime: 5 * 60_000,
  });
