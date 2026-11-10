import type { DiscordNotificationStatus } from '@/types/order';

export type StaffCallOptionInput = {
  label: string;
  is_active: boolean;
  display_order: number;
};
export type StaffCallOption = StaffCallOptionInput & { id: string };
export type StaffCall = {
  id: string;
  option_id: string;
  label: string;
  table_number: number | null;
  created_at: string;
  completed_at: string | null;
  notification_status: DiscordNotificationStatus;
  retry_available: boolean;
};
