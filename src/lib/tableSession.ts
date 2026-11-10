import type { CartItem } from '@/types/order';

export const TABLE_SESSION_TOKEN_KEY = 'deepdeepbar_table_session_token';
export const ADMIN_SESSION_TOKEN_KEY = 'deepdeepbar_admin_session_token';
export const CART_STORAGE_KEY = 'deepdeepbar_cart';

const canUseStorage = () => typeof window !== 'undefined';

export const getTableSessionToken = () =>
  canUseStorage()
    ? (sessionStorage.getItem(ADMIN_SESSION_TOKEN_KEY) ??
      localStorage.getItem(TABLE_SESSION_TOKEN_KEY))
    : null;

export const setTableSessionToken = (token: string) => {
  sessionStorage.removeItem(ADMIN_SESSION_TOKEN_KEY);
  sessionStorage.removeItem(CART_STORAGE_KEY);
  localStorage.setItem(TABLE_SESSION_TOKEN_KEY, token);
};

export const setAdminSessionToken = (token: string) => {
  clearCustomerSession();
  sessionStorage.setItem(ADMIN_SESSION_TOKEN_KEY, token);
};

const cartStorage = () =>
  sessionStorage.getItem(ADMIN_SESSION_TOKEN_KEY) ? sessionStorage : localStorage;

export const getStoredCart = (): CartItem[] => {
  if (!canUseStorage()) return [];
  try {
    const value: unknown = JSON.parse(cartStorage().getItem(CART_STORAGE_KEY) ?? '[]');
    return Array.isArray(value) ? (value as CartItem[]) : [];
  } catch {
    return [];
  }
};

export const storeCart = (cart: CartItem[]) =>
  cartStorage().setItem(CART_STORAGE_KEY, JSON.stringify(cart));

export const clearCustomerSession = (expectedToken = getTableSessionToken()) => {
  if (!canUseStorage() || expectedToken !== getTableSessionToken()) return false;
  if (sessionStorage.getItem(ADMIN_SESSION_TOKEN_KEY)) {
    sessionStorage.removeItem(ADMIN_SESSION_TOKEN_KEY);
    sessionStorage.removeItem(CART_STORAGE_KEY);
    return true;
  }
  localStorage.removeItem(TABLE_SESSION_TOKEN_KEY);
  localStorage.removeItem(CART_STORAGE_KEY);
  return true;
};
