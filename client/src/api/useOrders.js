import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from './axiosClient';

export const useOrders = (params) =>
  useQuery({
    queryKey: ['orders', params],
    queryFn: async () => {
      const { data } = await axiosClient.get('/orders', { params });
      return data.data;
    },
    placeholderData: (prev) => prev, // Keep previous data while loading (like keepPreviousData)
    staleTime: 30_000,
  });

export const useOrder = (id) =>
  useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data } = await axiosClient.get(`/orders/${id}`);
      return data.data.order;
    },
    enabled: !!id,
  });

export const useOrderStats = () =>
  useQuery({
    queryKey: ['order-stats'],
    queryFn: async () => {
      const { data } = await axiosClient.get('/orders/stats');
      return data.data;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
