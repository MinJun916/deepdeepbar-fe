import { api, publicApi } from '@/lib/axios';

import type {
  ActiveTableOrders,
  DiscordNotification,
  EnterTableResponse,
  Order,
  OrderMode,
  OrderPaginated,
  TableSession,
} from '@/types/order';

const sessionHeaders = (token: string) => ({ 'X-Table-Session-Token': token });

export const getOrderMode = async (signal?: AbortSignal) =>
  (await publicApi.get<OrderMode>('/store-settings/order-mode', { signal })).data;

export const enterAdminTable = async () =>
  (await api.post<EnterTableResponse>('/table-sessions/admin-enter')).data;

export const enterTable = async (tableNumber: number) =>
  (await publicApi.post<EnterTableResponse>('/table-sessions/enter', { table_number: tableNumber }))
    .data;

export const getCurrentTableSession = async (token: string, signal?: AbortSignal) =>
  (
    await publicApi.get<TableSession>('/table-sessions/current', {
      headers: sessionHeaders(token),
      signal,
    })
  ).data;

export const getCurrentOrders = async (token: string, signal?: AbortSignal) =>
  (
    await publicApi.get<Order[]>('/orders/current', {
      headers: sessionHeaders(token),
      signal,
    })
  ).data;

export const createOrder = async (
  token: string,
  idempotencyKey: string,
  items: Array<{ menu_price_id: string; quantity: number }>,
) =>
  (
    await publicApi.post<Order>(
      '/orders/',
      { items },
      { headers: { ...sessionHeaders(token), 'Idempotency-Key': idempotencyKey } },
    )
  ).data;

export const getActiveTables = async (signal?: AbortSignal) =>
  (await api.get<ActiveTableOrders[]>('/orders/active-tables', { signal })).data;

export type OrderHistoryQuery = {
  table_number?: number;
  is_pos_registered?: boolean;
  created_from?: string;
  created_to?: string;
  page?: number;
  limit?: number;
};

export const getOrderHistory = async (params: OrderHistoryQuery, signal?: AbortSignal) =>
  (await api.get<OrderPaginated>('/orders/history', { params, signal })).data;

export const setPosRegistration = async (orderId: string, isPosRegistered: boolean) =>
  (
    await api.patch<Order>(`/orders/${orderId}/pos-registration`, {
      is_pos_registered: isPosRegistered,
    })
  ).data;

export const checkoutTable = async (tableSessionId: string) =>
  (await api.patch<TableSession>(`/table-sessions/${tableSessionId}/checkout`)).data;

export const updateOrderMode = async (isOrderEnabled: boolean) =>
  (
    await api.patch<OrderMode>('/store-settings/order-mode', {
      is_order_enabled: isOrderEnabled,
    })
  ).data;

export const getOrderDiscordNotification = async (orderId: string, signal?: AbortSignal) =>
  (await api.get<DiscordNotification>(`/orders/${orderId}/discord-notification`, { signal })).data;

export const retryOrderDiscordNotification = async (orderId: string) =>
  (await api.post<DiscordNotification>(`/orders/${orderId}/discord-notification/retry`)).data;

export const getTableDiscordNotification = async (tableSessionId: string, signal?: AbortSignal) =>
  (
    await api.get<DiscordNotification>(`/table-sessions/${tableSessionId}/discord-notification`, {
      signal,
    })
  ).data;

export const retryTableDiscordNotification = async (tableSessionId: string) =>
  (
    await api.post<DiscordNotification>(
      `/table-sessions/${tableSessionId}/discord-notification/retry`,
    )
  ).data;
