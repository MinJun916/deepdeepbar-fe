'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AdminEntryModal from '@/components/admin/AdminEntryModal';
import Footer from '@/components/footer';
import IntroOverlay from '@/components/introOverlay';
import MenuCard from '@/components/menu/menuCard';
import ScrollToTopButton from '@/components/scrollToTopButton';
import { showToast } from '@/components/sonner';
import StaffCallDialog from '@/components/staffCall';
import { useMenusQuery } from '@/hooks/queries/useMenuQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { ApiError } from '@/lib/axios';
import { formatDateTime, formatWon, PRICE_TYPE_LABEL } from '@/lib/format';
import { formatAbv, normalizeMenuTags } from '@/lib/menu';
import {
  clearCustomerSession,
  getStoredCart,
  getTableSessionToken,
  setTableSessionToken,
  setAdminSessionToken,
  storeCart,
} from '@/lib/tableSession';
import {
  createOrder,
  enterTable,
  getCurrentOrders,
  getCurrentTableSession,
  getOrderMode,
} from '@/services/order.service';

import type { Menu } from '@/types/menu';
import type { CartItem, EnterTableResponse, Order, OrderMode, TableSession } from '@/types/order';

const categories = [
  { key: 'all', label: '전체' },
  { key: 'cocktail', label: '칵테일' },
  { key: 'whisky', label: '위스키' },
  { key: 'non-alcohol', label: '논알콜' },
  { key: 'highball', label: '하이볼' },
  { key: 'beer', label: '맥주' },
  { key: 'side', label: '사이드' },
] as const;

type MenuCategory = (typeof categories)[number]['key'];
type Panel = 'cart' | 'orders' | null;
const currency = new Intl.NumberFormat('ko-KR');

const sortMenus = (items: Menu[]) =>
  [...items].sort((a, b) => {
    if (a.is_signature !== b.is_signature) return a.is_signature ? -1 : 1;
    return a.name.localeCompare(b.name, 'ko-KR');
  });

const HomePageView = () => {
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState('');
  const [orderMode, setOrderMode] = useState<OrderMode | null>(null);
  const [session, setSession] = useState<TableSession | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [panel, setPanel] = useState<Panel>(null);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [selectedPriceId, setSelectedPriceId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [cartHighlighted, setCartHighlighted] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [staffCallOpen, setStaffCallOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [tableError, setTableError] = useState('');
  const [isEntering, setIsEntering] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderError, setOrderError] = useState('');
  const idempotencyRef = useRef<{ signature: string; key: string } | null>(null);
  const cartHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSearchKeyword = useDebouncedValue(searchKeyword.trim(), 300);
  const { data, isLoading, isError, refetch: refetchMenus } = useMenusQuery(debouncedSearchKeyword);

  const resetExpiredSession = useCallback((expectedToken: string | null) => {
    if (!clearCustomerSession(expectedToken)) return;
    setSession(null);
    setCart([]);
    setOrders([]);
    setPanel(null);
    setTableError('테이블 이용이 종료되었어요. 다시 입장해 주세요.');
  }, []);

  const refreshCustomerState = useCallback(
    async (includeSession = true) => {
      const token = getTableSessionToken();
      const [modeResult, sessionResult] = await Promise.allSettled([
        getOrderMode(),
        includeSession && token ? getCurrentTableSession(token) : Promise.resolve(null),
      ]);

      if (modeResult.status === 'fulfilled') {
        setOrderMode(modeResult.value);
        setBootError('');
      } else {
        setBootError('주문 가능 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
      }
      if (sessionResult.status === 'fulfilled') {
        setSession(sessionResult.value);
        if (token && sessionResult.value) {
          setOrdersLoading(true);
          try {
            setOrders(await getCurrentOrders(token));
            setOrdersError('');
          } catch (error) {
            if (error instanceof ApiError && error.status === 401) resetExpiredSession(token);
            else
              setOrdersError(
                error instanceof Error ? error.message : '주문 내역을 불러오지 못했어요.',
              );
          } finally {
            setOrdersLoading(false);
          }
        }
      } else if (sessionResult.reason instanceof ApiError && sessionResult.reason.status === 401) {
        resetExpiredSession(token);
      }
    },
    [resetExpiredSession],
  );

  useEffect(() => {
    let active = true;
    const boot = async () => {
      setCart(getStoredCart());
      try {
        await refreshCustomerState();
      } catch {
        if (active) setBootError('서비스 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      } finally {
        if (active) setBooting(false);
      }
    };
    void boot();
    return () => {
      active = false;
    };
  }, [refreshCustomerState]);

  useEffect(() => {
    const onFocus = () => void refreshCustomerState();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshCustomerState]);

  useEffect(
    () => () => {
      if (cartHighlightTimerRef.current) clearTimeout(cartHighlightTimerRef.current);
    },
    [],
  );

  const displayMenus = useMemo(
    () =>
      sortMenus(
        (data ?? [])
          .filter((menu) => menu.is_display)
          .map((menu) => ({ ...menu, tags: normalizeMenuTags(menu.tags) })),
      ),
    [data],
  );
  const filteredMenus = useMemo(
    () =>
      selectedCategory === 'all'
        ? displayMenus
        : displayMenus.filter((menu) => menu.category === selectedCategory),
    [displayMenus, selectedCategory],
  );
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  const updateCart = (next: CartItem[]) => {
    setCart(next);
    storeCart(next);
    setOrderError('');
  };

  const addToCart = (menu: Menu, priceId: string, quantity = 1) => {
    if (!orderMode?.is_order_enabled || menu.is_sold_out) return;
    const price = menu.prices.find((item) => item.id === priceId);
    if (!price) return;
    const existing = cart.find((item) => item.menu_price_id === price.id);
    if (!existing && cart.length >= 50) {
      showToast({ kind: 'warning', message: '장바구니에는 최대 50가지 메뉴를 담을 수 있어요.' });
      return;
    }
    const newItem: CartItem = {
      menu_id: menu.id,
      menu_price_id: price.id,
      menu_name: menu.name,
      menu_name_en: menu.name_en,
      price_type:
        price.price_type === 'shot' || price.price_type === 'bottle' ? price.price_type : 'default',
      unit_price: price.price,
      quantity: Math.min(99, quantity),
    };
    const next: CartItem[] = existing
      ? cart.map((item) =>
          item.menu_price_id === price.id
            ? { ...item, quantity: Math.min(99, item.quantity + quantity) }
            : item,
        )
      : [...cart, newItem];
    updateCart(next);
    setCartHighlighted(true);
    if (cartHighlightTimerRef.current) clearTimeout(cartHighlightTimerRef.current);
    cartHighlightTimerRef.current = setTimeout(() => setCartHighlighted(false), 650);
  };

  const openMenu = (menu: Menu) => {
    const firstPrice = [...(menu.prices ?? [])].sort(
      (a, b) => a.display_order - b.display_order,
    )[0];
    setSelectedMenu(menu);
    setSelectedPriceId(firstPrice?.id ?? '');
    setSelectedQuantity(1);
  };

  const addSelectedMenu = () => {
    if (!selectedMenu || !selectedPriceId) return;
    addToCart(selectedMenu, selectedPriceId, selectedQuantity);
    setSelectedMenu(null);
  };

  const changeQuantity = (priceId: string, amount: number) => {
    const next = cart
      .map((item) =>
        item.menu_price_id === priceId
          ? { ...item, quantity: Math.max(0, Math.min(99, item.quantity + amount)) }
          : item,
      )
      .filter((item) => item.quantity > 0);
    updateCart(next);
  };

  const handleEnter = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number(tableNumber);
    if (!Number.isInteger(value) || value < 1) {
      setTableError('1 이상의 테이블 번호를 입력해 주세요.');
      return;
    }
    setIsEntering(true);
    setTableError('');
    try {
      const entered = await enterTable(value);
      setTableSessionToken(entered.session_token);
      setSession(entered);
      setOrders([]);
      setTableNumber('');
      showToast({ kind: 'success', message: `${entered.table_number}번 테이블로 입장했어요.` });
    } catch (error) {
      setTableError(error instanceof Error ? error.message : '테이블에 입장하지 못했어요.');
    } finally {
      setIsEntering(false);
    }
  };

  const handleOrder = async () => {
    const token = getTableSessionToken();
    if (!token || !session || cart.length === 0 || !orderMode?.is_order_enabled) return;
    const payload = cart.map(({ menu_price_id, quantity }) => ({ menu_price_id, quantity }));
    const signature = JSON.stringify(payload);
    if (!idempotencyRef.current || idempotencyRef.current.signature !== signature) {
      idempotencyRef.current = { signature, key: crypto.randomUUID() };
    }
    setIsOrdering(true);
    setOrderError('');
    try {
      const created = await createOrder(token, idempotencyRef.current.key, payload);
      updateCart([]);
      idempotencyRef.current = null;
      setPanel('orders');
      showToast({
        kind: 'success',
        message: `${formatWon(created.total_amount)} 주문이 접수됐어요.`,
      });
      setOrdersLoading(true);
      try {
        setOrders(await getCurrentOrders(token));
        setOrdersError('');
      } catch (refreshError) {
        setOrders((current) => [...current, created]);
        setOrdersError(
          refreshError instanceof Error
            ? `주문은 접수됐지만 내역을 새로 불러오지 못했어요. ${refreshError.message}`
            : '주문은 접수됐지만 내역을 새로 불러오지 못했어요.',
        );
      } finally {
        setOrdersLoading(false);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        resetExpiredSession(token);
      } else {
        const message = error instanceof Error ? error.message : '주문하지 못했어요.';
        setOrderError(message);
        if (error instanceof ApiError && error.status === 400) void refetchMenus();
        if (error instanceof ApiError && error.status === 409) void refreshCustomerState(false);
      }
    } finally {
      setIsOrdering(false);
    }
  };

  if (booting) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f3ece2] text-sm text-[#6b7280]">
        메뉴를 준비하고 있어요…
      </main>
    );
  }

  const mustEnterTable = Boolean(orderMode?.is_order_enabled && !session);

  return (
    <main className="min-h-screen bg-[radial-gradient(120%_90%_at_50%_0%,#fcf8f2_0%,#f3ece2_56%,#ece2d6_100%)] text-[#1f2937]">
      <IntroOverlay />
      <div className="mx-auto w-full max-w-3xl px-4 pt-8 pb-36 sm:px-6 sm:pt-10">
        <header className="mb-7 sm:mb-9">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-[0.24em] text-[#876a51]">DEEP DEEP BAR</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Menu</h1>
            </div>
            <div className="flex items-center gap-2">
              {session ? (
                <span className="hidden rounded-full border border-[#d7cec2] bg-[#f8f3ec] px-3 py-2 text-sm font-semibold text-[#5a3d26] sm:inline-flex">
                  {session.table_number === null
                    ? '테이블 관리자'
                    : `Table ${session.table_number}`}
                </span>
              ) : null}
              {orderMode?.is_order_enabled && session ? (
                <>
                  <button
                    type="button"
                    onClick={() => setPanel('orders')}
                    aria-label={`현재 주문 내역 ${orders.length}건`}
                    className="relative grid h-11 w-11 place-items-center rounded-full border border-[#d7cec2] bg-[#f8f3ec] text-[#4a3322] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#876a51]"
                  >
                    <ReceiptIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanel('cart')}
                    aria-label={`장바구니 ${cartCount}개, ${formatWon(cartTotal)}`}
                    className={`relative grid h-11 w-11 place-items-center rounded-full bg-[#2f2924] text-white shadow-[0_8px_18px_rgba(47,41,36,0.2)] transition duration-200 hover:bg-[#463b33] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#876a51] ${cartHighlighted ? 'scale-110 ring-4 ring-[#b76e48]/25' : ''}`}
                  >
                    <CartIcon />
                    {cartCount > 0 ? (
                      <span className="absolute -top-1 -right-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#b76e48] px-1 text-[10px] font-bold text-white">
                        {cartCount > 99 ? '99+' : cartCount}
                      </span>
                    ) : null}
                  </button>
                  <span className="sr-only" aria-live="polite">
                    {cartHighlighted ? `장바구니에 담았어요. 현재 ${cartCount}개` : ''}
                  </span>
                </>
              ) : null}
            </div>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-6 break-keep text-[#4b5563] sm:text-[15px]">
            혼자와도 함께하는, 밤이 깊어질수록 더 좋아지는 공간. 혼술바 딥딥
          </p>
          {orderMode && !orderMode.is_order_enabled ? (
            <p className="mt-4 rounded-xl border border-[#dccdbd] bg-[#f7efe6] px-4 py-3 text-sm text-[#674c34]">
              지금은 메뉴판 전용 모드예요. 메뉴를 편하게 둘러보세요.
            </p>
          ) : null}
          {bootError ? <p className="mt-3 text-sm text-[#9f3a38]">{bootError}</p> : null}
        </header>

        <section className="mb-4 sm:mb-5">
          <div className="relative">
            <input
              type="search"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="메뉴명 또는 영문명 검색"
              aria-label="메뉴 검색"
              className="w-full rounded-full border border-[#d7cec2] bg-[#f8f3ec] py-2.5 pr-10 pl-4 text-base outline-none placeholder:text-[#9ca3af] focus:border-[#c29a74] focus:bg-white [&::-webkit-search-cancel-button]:hidden"
            />
            {searchKeyword ? (
              <button
                type="button"
                onClick={() => setSearchKeyword('')}
                aria-label="검색어 지우기"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-xl text-[#9ca3af]"
              >
                ×
              </button>
            ) : null}
          </div>
        </section>

        <section className="hide-scrollbar -mx-1 mb-5 overflow-x-auto px-1 sm:mb-6">
          <div className="flex min-w-max gap-2">
            {categories.map((category) => (
              <button
                key={category.key}
                type="button"
                onClick={() => setSelectedCategory(category.key)}
                className={`rounded-full border px-3.5 py-2 text-sm font-medium transition ${selectedCategory === category.key ? 'border-[#c29a74] bg-[#f0dfcf] text-[#4a3322] shadow-[0_8px_18px_rgba(120,84,52,0.14)]' : 'border-[#d7cec2] bg-[#f8f3ec] text-[#374151]'}`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3.5 sm:space-y-4">
          {isLoading ? (
            <StatusCard>메뉴를 불러오는 중이에요.</StatusCard>
          ) : isError ? (
            <StatusCard>메뉴를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</StatusCard>
          ) : filteredMenus.length > 0 ? (
            filteredMenus.map((menu) => (
              <MenuCard
                key={menu.id}
                menu={menu}
                currency={currency}
                onSelect={() => openMenu(menu)}
              />
            ))
          ) : (
            <StatusCard>
              {debouncedSearchKeyword ? '검색 결과가 없어요.' : '표시할 메뉴가 없어요.'}
            </StatusCard>
          )}
        </section>
        <Footer />
      </div>

      <nav
        aria-label="메뉴판 빠른 메뉴"
        className="fixed inset-x-0 bottom-0 z-30 grid justify-items-center border-t border-[#e2d8cb] bg-[#faf6f0]/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
      >
        <div className="grid w-full max-w-3xl grid-cols-2 gap-3 justify-self-center">
          <button
            type="button"
            onClick={() => setStaffCallOpen(true)}
            className="flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-[#cdbca9] bg-white px-3 font-semibold text-[#5a3d26] motion-safe:active:scale-[0.98]"
          >
            직원 호출
          </button>
          <button
            type="button"
            onClick={() => setPanel('cart')}
            disabled={!orderMode?.is_order_enabled || !session}
            className="flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-[#2f2924] px-3 font-semibold text-white disabled:bg-[#ded5ca] disabled:text-[#817365] motion-safe:active:scale-[0.98]"
          >
            장바구니{cartCount ? ` · ${cartCount}` : ''}
          </button>
        </div>
      </nav>
      {staffCallOpen ? (
        <StaffCallDialog
          session={session}
          onClose={() => setStaffCallOpen(false)}
          onExpired={resetExpiredSession}
          onEntered={(entered) => {
            setTableSessionToken(entered.session_token);
            setSession(entered);
            setOrders([]);
          }}
        />
      ) : null}
      <ScrollToTopButton />

      {selectedMenu ? (
        <MenuDetailModal
          menu={selectedMenu}
          selectedPriceId={selectedPriceId}
          quantity={selectedQuantity}
          canOrder={Boolean(orderMode?.is_order_enabled && session)}
          onPrice={setSelectedPriceId}
          onQuantity={setSelectedQuantity}
          onClose={() => setSelectedMenu(null)}
          onAdd={addSelectedMenu}
        />
      ) : null}

      {mustEnterTable ? (
        <TableEntryModal
          tableNumber={tableNumber}
          error={tableError}
          pending={isEntering}
          onChange={setTableNumber}
          onSubmit={handleEnter}
          onAdmin={() => setAdminLoginOpen(true)}
        />
      ) : null}
      {adminLoginOpen ? (
        <AdminEntryModal
          onClose={() => setAdminLoginOpen(false)}
          onEnter={(entered: EnterTableResponse) => {
            setAdminSessionToken(entered.session_token);
            setSession(entered);
            setCart([]);
            setOrders([]);
            idempotencyRef.current = null;
            setAdminLoginOpen(false);
          }}
        />
      ) : null}
      {panel ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/30 sm:items-center sm:justify-center"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPanel(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={panel === 'cart' ? '장바구니' : '현재 주문 내역'}
            className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border border-[#ded3c6] bg-[#faf6f0] p-5 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {panel === 'cart' ? '장바구니' : '현재 주문 내역'}
              </h2>
              <button
                type="button"
                onClick={() => setPanel(null)}
                aria-label="닫기"
                className="rounded-full p-2 text-xl text-[#6b7280]"
              >
                ×
              </button>
            </div>
            {panel === 'cart' ? (
              <CartContent
                cart={cart}
                total={cartTotal}
                orderEnabled={Boolean(orderMode?.is_order_enabled)}
                pending={isOrdering}
                error={orderError}
                onQuantity={changeQuantity}
                onOrder={handleOrder}
              />
            ) : (
              <OrdersContent orders={orders} loading={ordersLoading} error={ordersError} />
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
};

const StatusCard = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-[#d7cec2] bg-[#f8f3ec] p-5 text-sm text-[#4b5563]">
    {children}
  </div>
);

const CartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5 8h14l-1 12H6L5 8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path
      d="M9 9V6a3 3 0 0 1 6 0v3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const ReceiptIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="M9 8h6M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const MenuDetailModal = ({
  menu,
  selectedPriceId,
  quantity,
  canOrder,
  onPrice,
  onQuantity,
  onClose,
  onAdd,
}: {
  menu: Menu;
  selectedPriceId: string;
  quantity: number;
  canOrder: boolean;
  onPrice: (id: string) => void;
  onQuantity: (quantity: number) => void;
  onClose: () => void;
  onAdd: () => void;
}) => {
  const prices = [...(menu.prices ?? [])].sort((a, b) => a.display_order - b.display_order);
  const selectedPrice = prices.find((price) => price.id === selectedPriceId);
  const disabled = menu.is_sold_out || !canOrder || !selectedPrice;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-[#211c18]/40 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-detail-title"
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-[#ded3c6] bg-[#faf7f2] p-5 shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-6"
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#d8cec3] sm:hidden" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="menu-detail-title" className="text-2xl font-semibold tracking-tight">
                {menu.name}
              </h2>
              {menu.is_signature ? (
                <span className="rounded-full bg-[#f0dfcf] px-2 py-1 text-[10px] font-bold text-[#68482f]">
                  SIGNATURE
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-[#8a7d71]">{menu.name_en}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="메뉴 상세 닫기"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eee7df] text-xl text-[#6b625b]"
          >
            ×
          </button>
        </div>

        <p className="mt-5 text-sm leading-6 break-keep text-[#4b5563]">{menu.description}</p>
        <dl className="mt-4 grid grid-cols-[1fr_auto] gap-2 text-sm">
          {menu.taste_note ? (
            <div className="rounded-xl bg-[#f1e9df] px-4 py-3 text-[#5d5045]">
              <dt className="text-[10px] font-bold tracking-widest text-[#967354]">TASTE</dt>
              <dd className="mt-1 break-keep">{menu.taste_note}</dd>
            </div>
          ) : null}
          <div className="rounded-xl bg-[#f1e9df] px-4 py-3 text-[#5d5045]">
            <dt className="text-[10px] font-bold tracking-widest text-[#967354]">ABV</dt>
            <dd className="mt-1 font-semibold">{formatAbv(menu.abv)}</dd>
          </div>
        </dl>
        {menu.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {menu.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[#eee7df] px-2.5 py-1 text-[11px] text-[#6b625b]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-6">
          <p className="text-sm font-semibold">옵션</p>
          {prices.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {prices.map((price) => {
                const selected = selectedPriceId === price.id;
                return (
                  <button
                    key={price.id}
                    type="button"
                    onClick={() => onPrice(price.id)}
                    aria-pressed={selected}
                    className={`flex min-h-13 items-center justify-between rounded-xl border px-4 text-sm transition ${selected ? 'border-[#8f6848] bg-[#f0dfcf] text-[#3f2d20]' : 'border-[#ded3c6] bg-white text-[#4b5563]'}`}
                  >
                    <span className="font-medium">
                      {PRICE_TYPE_LABEL[price.price_type as keyof typeof PRICE_TYPE_LABEL] ??
                        price.price_type}
                    </span>
                    <span className="font-semibold">{formatWon(price.price)}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 rounded-xl bg-[#f1e9df] p-4 text-sm text-[#6b7280]">
              선택 가능한 가격이 없어요.
            </p>
          )}
        </div>

        {canOrder && !menu.is_sold_out && selectedPrice ? (
          <div className="mt-5 flex items-center justify-between">
            <span className="text-sm font-semibold">수량</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                aria-label="수량 줄이기"
                className="grid h-10 w-10 place-items-center rounded-full border border-[#d7cec2] bg-white disabled:opacity-35"
              >
                −
              </button>
              <span className="w-6 text-center font-semibold">{quantity}</span>
              <button
                type="button"
                onClick={() => onQuantity(Math.min(99, quantity + 1))}
                disabled={quantity >= 99}
                aria-label="수량 늘리기"
                className="grid h-10 w-10 place-items-center rounded-full border border-[#d7cec2] bg-white disabled:opacity-35"
              >
                +
              </button>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          disabled={disabled}
          onClick={onAdd}
          className="mt-6 min-h-13 w-full rounded-xl bg-[#2f2924] px-4 font-semibold text-white disabled:bg-[#d8d0c8] disabled:text-[#817970]"
        >
          {menu.is_sold_out
            ? '품절된 메뉴예요'
            : !canOrder
              ? '현재는 메뉴만 볼 수 있어요'
              : selectedPrice
                ? `${formatWon(selectedPrice.price * quantity)} · 장바구니에 담기`
                : '옵션을 선택해 주세요'}
        </button>
      </section>
    </div>
  );
};

const TableEntryModal = ({
  tableNumber,
  error,
  pending,
  onChange,
  onSubmit,
  onAdmin,
}: {
  tableNumber: string;
  error: string;
  pending: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onAdmin: () => void;
}) => (
  <div className="fixed inset-0 z-50 grid place-items-center bg-[#2f2924]/45 p-4 backdrop-blur-sm">
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="table-title"
      className="w-full max-w-sm rounded-3xl border border-[#ded3c6] bg-[#faf6f0] p-6 shadow-2xl"
    >
      <button
        type="button"
        onClick={onAdmin}
        disabled={pending}
        className="text-xs font-semibold tracking-[0.2em] text-[#876a51]"
      >
        WELCOME
      </button>
      <h2 id="table-title" className="mt-2 text-2xl font-semibold">
        테이블 번호를 알려주세요
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#6b7280]">
        테이블의 번호를 입력하면 바로 주문할 수 있어요.
      </p>
      <form onSubmit={onSubmit} className="mt-5">
        <input
          autoFocus
          inputMode="numeric"
          pattern="[0-9]*"
          value={tableNumber}
          onChange={(event) => onChange(event.target.value)}
          placeholder="예: 21"
          aria-label="테이블 번호"
          className="min-h-13 w-full rounded-xl border border-[#cdbca9] bg-white px-4 text-lg outline-none focus:border-[#876a51]"
        />
        {error ? (
          <p role="alert" className="mt-3 rounded-lg bg-[#f8e8e5] px-3 py-2 text-sm text-[#963f38]">
            {error}
          </p>
        ) : null}
        <button
          disabled={pending}
          className="mt-4 min-h-12 w-full rounded-xl bg-[#2f2924] font-semibold text-white disabled:opacity-50"
        >
          {pending ? '입장하는 중…' : '메뉴판 입장'}
        </button>
      </form>
    </section>
  </div>
);

const CartContent = ({
  cart,
  total,
  orderEnabled,
  pending,
  error,
  onQuantity,
  onOrder,
}: {
  cart: CartItem[];
  total: number;
  orderEnabled: boolean;
  pending: boolean;
  error: string;
  onQuantity: (id: string, amount: number) => void;
  onOrder: () => void;
}) => (
  <div className="mt-5">
    {cart.length === 0 ? (
      <p className="rounded-xl bg-white p-5 text-sm text-[#6b7280]">아직 담은 메뉴가 없어요.</p>
    ) : (
      <div className="space-y-3">
        {cart.map((item) => (
          <div key={item.menu_price_id} className="rounded-xl border border-[#e2d8cb] bg-white p-4">
            <div className="flex justify-between gap-3">
              <div>
                <h3 className="font-semibold">{item.menu_name}</h3>
                <p className="mt-1 text-xs text-[#6b7280]">
                  {PRICE_TYPE_LABEL[item.price_type]} · {formatWon(item.unit_price)}
                </p>
              </div>
              <p className="font-semibold">{formatWon(item.unit_price * item.quantity)}</p>
            </div>
            <div className="mt-3 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => onQuantity(item.menu_price_id, -1)}
                aria-label={`${item.menu_name} 수량 줄이기`}
                className="h-10 w-10 rounded-full border border-[#d7cec2]"
              >
                −
              </button>
              <span className="w-6 text-center font-semibold">{item.quantity}</span>
              <button
                type="button"
                onClick={() => onQuantity(item.menu_price_id, 1)}
                aria-label={`${item.menu_name} 수량 늘리기`}
                className="h-10 w-10 rounded-full border border-[#d7cec2]"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
    {cart.length > 0 ? (
      <>
        <div className="mt-5 flex items-center justify-between border-t border-[#d7cec2] pt-4 text-lg font-semibold">
          <span>합계</span>
          <span>{formatWon(total)}</span>
        </div>
        {error ? (
          <p role="alert" className="mt-3 rounded-lg bg-[#f8e8e5] px-3 py-2 text-sm text-[#963f38]">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          disabled={pending || !orderEnabled}
          onClick={onOrder}
          className="mt-4 min-h-13 w-full rounded-xl bg-[#2f2924] font-semibold text-white disabled:opacity-50"
        >
          {pending
            ? '주문을 접수하는 중…'
            : orderEnabled
              ? `${formatWon(total)} 주문하기`
              : '현재 주문할 수 없어요'}
        </button>
      </>
    ) : null}
  </div>
);

const OrdersContent = ({
  orders,
  loading,
  error,
}: {
  orders: Order[];
  loading: boolean;
  error: string;
}) => (
  <div className="mt-5 space-y-3">
    {error ? (
      <p role="alert" className="rounded-lg bg-[#f8e8e5] px-3 py-2 text-sm text-[#963f38]">
        {error}
      </p>
    ) : null}
    {loading && orders.length === 0 ? (
      <p className="rounded-xl bg-white p-5 text-sm text-[#6b7280]">
        주문 내역을 불러오는 중이에요.
      </p>
    ) : orders.length === 0 ? (
      <p className="rounded-xl bg-white p-5 text-sm text-[#6b7280]">아직 주문 내역이 없어요.</p>
    ) : (
      [...orders].reverse().map((order) => (
        <article key={order.id} className="rounded-xl border border-[#e2d8cb] bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-[#876a51]">{formatDateTime(order.created_at)}</p>
              <h3 className="mt-1 font-semibold">주문 {order.id.slice(0, 8)}</h3>
            </div>
            <span className="text-xs font-medium text-[#6b7280]">
              {order.is_pos_registered ? '포스 등록 완료' : '접수 완료'}
            </span>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>
                  {item.menu_name} · {PRICE_TYPE_LABEL[item.price_type]} × {item.quantity}
                </span>
                <span>{formatWon(item.line_total)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-[#eee5da] pt-3 text-right font-semibold">
            {formatWon(order.total_amount)}
          </p>
        </article>
      ))
    )}
  </div>
);

export default HomePageView;
