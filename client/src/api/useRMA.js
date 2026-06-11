import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from './axiosClient';

export const useTransitionOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, nextStatus, ...body }) => {
      const { data } = await axiosClient.patch(`/rma/${orderId}/transition`, {
        nextStatus,
        ...body,
      });
      return data.data.order;
    },

    // ─── Optimistic Update ───────────────────────────────────────────────
    onMutate: async ({ orderId, nextStatus }) => {
      // Cancel any outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      await queryClient.cancelQueries({ queryKey: ['order', orderId] });

      // Snapshot previous values for rollback
      const previousOrder = queryClient.getQueryData(['order', orderId]);
      const previousOrders = queryClient.getQueriesData({ queryKey: ['orders'] });

      // Optimistically update the single order cache
      if (previousOrder) {
        queryClient.setQueryData(['order', orderId], (old) => ({
          ...old,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        }));
      }

      // Optimistically update in the orders list cache
      queryClient.setQueriesData({ queryKey: ['orders'] }, (old) => {
        if (!old?.orders) return old;
        return {
          ...old,
          orders: old.orders.map((o) =>
            o._id === orderId ? { ...o, status: nextStatus } : o
          ),
        };
      });

      return { previousOrder, previousOrders };
    },

    // ─── Rollback on Error ────────────────────────────────────────────────
    onError: (err, { orderId }, context) => {
      if (context?.previousOrder) {
        queryClient.setQueryData(['order', orderId], context.previousOrder);
      }
      if (context?.previousOrders) {
        context.previousOrders.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    // ─── Always refetch on settle ─────────────────────────────────────────
    onSettled: (_, __, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
    },
  });
};

export const useAuditLog = (orderId) =>
  useQuery({
    queryKey: ['audit', orderId],
    queryFn: async () => {
      const { data } = await axiosClient.get(`/rma/${orderId}/audit`);
      return data.data.logs;
    },
    enabled: !!orderId,
  });

export const usePendingRMAs = () =>
  useQuery({
    queryKey: ['pending-rmas'],
    queryFn: async () => {
      const { data } = await axiosClient.get('/rma/pending');
      return data.data;
    },
    refetchInterval: 30_000,
  });
