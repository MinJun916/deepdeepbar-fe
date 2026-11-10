export type UUID = string;
export type ISODateTime = string;
export type PriceType = 'bottle' | 'shot' | 'default';
export type UserRole = 'admin' | 'staff';
export type DiscordNotificationStatus = 'pending' | 'sending' | 'sent' | 'failed';

export type TableSession = {
  id: UUID;
  table_number: number | null;
  created_at: ISODateTime;
  checked_out_at: ISODateTime | null;
  checked_out_by_user_id: UUID | null;
  checked_out_by_discord_user_id: string | null;
  is_active: boolean;
};

export type EnterTableResponse = TableSession & { session_token: string };

export type OrderItem = {
  id: UUID;
  menu_id: UUID;
  menu_price_id: UUID | null;
  menu_name: string;
  menu_name_en: string;
  price_type: PriceType;
  unit_price: number;
  quantity: number;
  line_total: number;
  display_order: number;
};

export type Order = {
  id: UUID;
  table_session_id: UUID;
  table_number: number | null;
  idempotency_key: UUID;
  total_amount: number;
  is_pos_registered: boolean;
  pos_registered_at: ISODateTime | null;
  created_at: ISODateTime;
  items: OrderItem[];
};

export type ActiveTableOrders = {
  table_session_id: UUID;
  table_number: number | null;
  entered_at: ISODateTime;
  order_count: number;
  total_amount: number;
  unregistered_order_count: number;
  orders: Order[];
};

export type OrderPaginated = { items: Order[]; total: number; page: number; limit: number };
export type OrderMode = { is_order_enabled: boolean; updated_at: ISODateTime };

export type DiscordNotification = {
  id: UUID;
  order_id?: UUID;
  table_session_id?: UUID;
  status: DiscordNotificationStatus;
  attempt_count: number;
  last_attempted_at: ISODateTime | null;
  sent_at: ISODateTime | null;
  discord_message_id: string | null;
  last_error: string | null;
  created_at?: ISODateTime;
  updated_at?: ISODateTime;
};

export type CartItem = {
  menu_id: UUID;
  menu_price_id: UUID;
  menu_name: string;
  menu_name_en: string;
  price_type: PriceType;
  unit_price: number;
  quantity: number;
};

export type CurrentAdmin = { id: UUID; email: string; name: string; role: UserRole };
