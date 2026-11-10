import { api, publicApi } from '@/lib/axios';

import type { StaffCall, StaffCallOption, StaffCallOptionInput } from '@/types/staff-call';

export const getStaffCallOptions = async (admin = false, signal?: AbortSignal) =>
  (
    await (admin ? api : publicApi).get<StaffCallOption[]>(
      admin ? '/staff-call-options/admin' : '/staff-call-options',
      { signal },
    )
  ).data;

export const createStaffCallOption = async (input: StaffCallOptionInput) =>
  (await api.post<StaffCallOption>('/staff-call-options', input)).data;

export const updateStaffCallOption = async (id: string, input: StaffCallOptionInput) =>
  (await api.patch<StaffCallOption>(`/staff-call-options/${id}`, input)).data;

export const deleteStaffCallOption = async (id: string) => {
  await api.delete(`/staff-call-options/${id}`);
};

export const getCurrentStaffCalls = async (token: string, signal?: AbortSignal) =>
  (
    await publicApi.get<StaffCall[]>('/staff-calls/current', {
      headers: { 'X-Table-Session-Token': token },
      signal,
    })
  ).data;

export const createStaffCall = async (token: string, optionId: string) =>
  (
    await publicApi.post<StaffCall>(
      '/staff-calls/',
      { option_id: optionId },
      {
        headers: { 'X-Table-Session-Token': token },
      },
    )
  ).data;
