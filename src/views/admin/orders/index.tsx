'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { showToast } from '@/components/sonner';
import { ApiError } from '@/lib/axios';
import { formatDateTime, formatWon, PRICE_TYPE_LABEL } from '@/lib/format';
import { getCurrentAdmin } from '@/services/auth.service';
import {
  checkoutTable,
  getActiveTables,
  getOrderDiscordNotification,
  getOrderHistory,
  getOrderMode,
  getTableDiscordNotification,
  retryOrderDiscordNotification,
  retryTableDiscordNotification,
  setPosRegistration,
  updateOrderMode,
} from '@/services/order.service';

import type {
  ActiveTableOrders,
  CurrentAdmin,
  Order,
  OrderMode,
  OrderPaginated,
} from '@/types/order';

type Tab = 'active' | 'history' | 'settings';
type HistoryFilters = { tableNumber: string; pos: string; from: string; to: string };
const initialFilters: HistoryFilters = { tableNumber: '', pos: '', from: '', to: '' };

const AdminOrdersPageView = () => {
  const [tab, setTab] = useState<Tab>('active');
  const [admin, setAdmin] = useState<CurrentAdmin | null>(null);
  const [tables, setTables] = useState<ActiveTableOrders[]>([]);
  const [mode, setMode] = useState<OrderMode | null>(null);
  const [history, setHistory] = useState<OrderPaginated | null>(null);
  const [filters, setFilters] = useState<HistoryFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<HistoryFilters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingKey, setPendingKey] = useState('');
  const [checkoutTarget, setCheckoutTarget] = useState<ActiveTableOrders | null>(null);
  const [paymentChecked, setPaymentChecked] = useState(false);

  const loadActive = useCallback(async () => {
    try {
      const data = await getActiveTables();
      setTables([...data].sort((a, b) => (a.table_number ?? 0) - (b.table_number ?? 0)));
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '활성 테이블을 불러오지 못했어요.');
    }
  }, []);

  const loadHistory = useCallback(
    async (page = 1, current = appliedFilters) => {
      if (current.from && current.to && new Date(current.from) > new Date(current.to)) {
        setError('조회 시작일은 종료일보다 늦을 수 없어요.');
        return;
      }
      try {
        const data = await getOrderHistory({
          table_number: current.tableNumber ? Number(current.tableNumber) : undefined,
          is_pos_registered: current.pos ? current.pos === 'true' : undefined,
          created_from: current.from
            ? new Date(`${current.from}T00:00:00+09:00`).toISOString()
            : undefined,
          created_to: current.to
            ? new Date(`${current.to}T23:59:59+09:00`).toISOString()
            : undefined,
          page,
          limit: 20,
        });
        setHistory(data);
        setError('');
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '주문 이력을 불러오지 못했어요.');
      }
    },
    [appliedFilters],
  );

  const loadMode = useCallback(async () => {
    try {
      setMode(await getOrderMode());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '주문 모드를 불러오지 못했어요.');
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([
        loadActive(),
        loadMode(),
        getCurrentAdmin()
          .then(setAdmin)
          .catch(() => null),
      ]);
      setLoading(false);
    };
    void load();
  }, [loadActive, loadMode]);

  useEffect(() => {
    const refresh = () => void loadActive();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [loadActive]);

  const togglePos = async (order: Order) => {
    setPendingKey(`pos-${order.id}`);
    try {
      await setPosRegistration(order.id, !order.is_pos_registered);
      await loadActive();
      showToast({
        kind: 'success',
        message: order.is_pos_registered ? '포스 등록을 취소했어요.' : '포스 등록을 완료했어요.',
      });
    } catch (mutationError) {
      showToast({
        kind: 'error',
        message:
          mutationError instanceof Error ? mutationError.message : '상태를 변경하지 못했어요.',
      });
    } finally {
      setPendingKey('');
    }
  };

  const confirmCheckout = async () => {
    if (!checkoutTarget || checkoutTarget.unregistered_order_count > 0 || !paymentChecked) return;
    setPendingKey(`checkout-${checkoutTarget.table_session_id}`);
    try {
      await checkoutTable(checkoutTarget.table_session_id);
      setCheckoutTarget(null);
      setPaymentChecked(false);
      await loadActive();
      setHistory(null);
      showToast({
        kind: 'success',
        message: `${checkoutTarget.table_number === null ? '테이블 관리자' : `${checkoutTarget.table_number}번 테이블`} 체크아웃을 완료했어요.`,
      });
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : '체크아웃하지 못했어요.');
    } finally {
      setPendingKey('');
    }
  };

  const toggleMode = async () => {
    if (!mode) return;
    const next = !mode.is_order_enabled;
    if (
      !window.confirm(
        next ? '고객 주문을 다시 받을까요?' : '고객 주문을 중지하고 메뉴판 전용 모드로 전환할까요?',
      )
    )
      return;
    setPendingKey('mode');
    try {
      setMode(await updateOrderMode(next));
      showToast({
        kind: 'success',
        message: next ? '주문을 받기 시작했어요.' : '메뉴판 전용 모드로 전환했어요.',
      });
    } catch (mutationError) {
      setError(
        mutationError instanceof Error ? mutationError.message : '주문 모드를 변경하지 못했어요.',
      );
    } finally {
      setPendingKey('');
    }
  };

  const applyHistoryFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedFilters(filters);
    void loadHistory(1, filters);
  };

  const selectTab = (nextTab: Tab) => {
    setTab(nextTab);
    if (nextTab === 'history' && !history) void loadHistory();
  };

  return (
    <main className="min-h-dvh bg-[radial-gradient(120%_90%_at_50%_0%,#fcf8f2_0%,#f3ece2_56%,#ece2d6_100%)] text-[#1f2937]">
      <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-16 sm:px-6 sm:pt-10">
        <AdminPageHeader
          title="매장 운영"
          description={
            admin
              ? `${admin.name} · ${admin.role === 'admin' ? '관리자' : '스태프'}`
              : '주문과 테이블 상태를 관리합니다.'
          }
        />
        <div className="mb-6 flex gap-2 overflow-x-auto" role="tablist">
          {(
            [
              ['active', '활성 테이블'],
              ['history', '주문 이력'],
              ['settings', '주문 설정'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => selectTab(key)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${tab === key ? 'border-[#a97e58] bg-[#ead8c6] text-[#4a3322]' : 'border-[#d7cec2] bg-[#f8f3ec] text-[#6b7280]'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {error ? (
          <div
            role="alert"
            className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-[#e4bbb5] bg-[#f8e8e5] p-4 text-sm text-[#963f38]"
          >
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} aria-label="오류 닫기">
              ×
            </button>
          </div>
        ) : null}
        {loading ? (
          <Panel>운영 정보를 불러오는 중이에요…</Panel>
        ) : tab === 'active' ? (
          <ActiveTables
            tables={tables}
            pendingKey={pendingKey}
            onRefresh={loadActive}
            onTogglePos={togglePos}
            onCheckout={(table) => {
              setCheckoutTarget(table);
              setPaymentChecked(false);
            }}
          />
        ) : tab === 'history' ? (
          <HistoryView
            filters={filters}
            history={history}
            onFilters={setFilters}
            onSubmit={applyHistoryFilters}
            onPage={(page) => void loadHistory(page)}
          />
        ) : (
          <SettingsView mode={mode} pending={pendingKey === 'mode'} onToggle={toggleMode} />
        )}
      </div>
      {checkoutTarget ? (
        <CheckoutModal
          table={checkoutTarget}
          checked={paymentChecked}
          pending={pendingKey.startsWith('checkout-')}
          onChecked={setPaymentChecked}
          onClose={() => setCheckoutTarget(null)}
          onConfirm={confirmCheckout}
        />
      ) : null}
    </main>
  );
};

const Panel = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <section className={`rounded-2xl border border-[#e2d8cb] bg-[#f8f3ec] p-5 ${className}`}>
    {children}
  </section>
);

const ActiveTables = ({
  tables,
  pendingKey,
  onRefresh,
  onTogglePos,
  onCheckout,
}: {
  tables: ActiveTableOrders[];
  pendingKey: string;
  onRefresh: () => Promise<void>;
  onTogglePos: (order: Order) => void;
  onCheckout: (table: ActiveTableOrders) => void;
}) => (
  <section>
    <div className="mb-4 flex items-center justify-between">
      <p className="text-sm text-[#6b7280]">30초마다 자동으로 갱신됩니다.</p>
      <button
        type="button"
        onClick={() => void onRefresh()}
        className="rounded-lg border border-[#d7cec2] bg-white px-3 py-2 text-sm font-medium"
      >
        새로고침
      </button>
    </div>
    {tables.length === 0 ? (
      <Panel>현재 이용 중인 테이블이 없어요.</Panel>
    ) : (
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {tables.map((table) => (
          <Panel key={table.table_session_id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-wide text-[#876a51]">TABLE</p>
                <h2 className="mt-1 text-2xl font-semibold">
                  {table.table_number === null ? '관리자' : `${table.table_number}번`}
                </h2>
                <p className="mt-1 text-xs text-[#6b7280]">
                  {formatDateTime(table.entered_at)} 입장
                </p>
              </div>
              <button
                type="button"
                onClick={() => onCheckout(table)}
                className="rounded-lg border border-[#cdbca9] bg-white px-3 py-2 text-sm font-semibold"
              >
                체크아웃
              </button>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Stat label="주문" value={`${table.order_count}건`} />
              <Stat label="누적" value={formatWon(table.total_amount)} />
              <Stat
                label="미등록"
                value={`${table.unregistered_order_count}건`}
                warning={table.unregistered_order_count > 0}
              />
            </dl>
            {table.table_number !== null ? (
              <NotificationStatus kind="table" id={table.table_session_id} />
            ) : null}
            {table.orders.length === 0 ? (
              <p className="mt-4 rounded-xl bg-white p-4 text-sm text-[#6b7280]">
                아직 주문이 없는 활성 테이블입니다.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {table.orders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-xl border border-[#e5dbcf] bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-[#6b7280]">
                          {formatDateTime(order.created_at)} · {order.id.slice(0, 8)}
                        </p>
                        <p className="mt-1 font-semibold">{formatWon(order.total_amount)}</p>
                      </div>
                      <button
                        type="button"
                        disabled={pendingKey === `pos-${order.id}`}
                        onClick={() => onTogglePos(order)}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${order.is_pos_registered ? 'border border-[#b9c9ba] bg-[#edf5ed] text-[#355438]' : 'border border-[#ddc5a9] bg-[#fff6e9] text-[#7a5224]'}`}
                      >
                        {pendingKey === `pos-${order.id}`
                          ? '처리 중…'
                          : order.is_pos_registered
                            ? '✓ 포스 등록됨 · 취소'
                            : '! 포스 미등록 · 완료'}
                      </button>
                    </div>
                    <OrderItems order={order} />
                    <NotificationStatus kind="order" id={order.id} />
                  </article>
                ))}
              </div>
            )}
          </Panel>
        ))}
      </div>
    )}
  </section>
);

const Stat = ({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) => (
  <div className="rounded-xl bg-white px-2 py-3">
    <dt className="text-xs text-[#6b7280]">{label}</dt>
    <dd className={`mt-1 text-sm font-semibold ${warning ? 'text-[#9a5b16]' : ''}`}>{value}</dd>
  </div>
);

const OrderItems = ({ order }: { order: Order }) => (
  <ul className="mt-3 space-y-1.5 border-t border-[#eee5da] pt-3 text-sm">
    {order.items.map((item) => (
      <li key={item.id} className="flex justify-between gap-2">
        <span>
          {item.menu_name} · {PRICE_TYPE_LABEL[item.price_type]} × {item.quantity}
        </span>
        <span>{formatWon(item.line_total)}</span>
      </li>
    ))}
  </ul>
);

const NotificationStatus = ({ kind, id }: { kind: 'order' | 'table'; id: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState(false);
  const queryClient = useQueryClient();
  const queryKey = ['discord-notification', kind, id];
  const {
    data: notification,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      kind === 'order'
        ? getOrderDiscordNotification(id, signal)
        : getTableDiscordNotification(id, signal),
    enabled: expanded && !pending,
    staleTime: 15000,
    retry: false,
  });
  const retry = async () => {
    if (pending) return;
    setPending(true);
    try {
      await queryClient.cancelQueries({ queryKey, exact: true });
      const result =
        kind === 'order'
          ? await retryOrderDiscordNotification(id)
          : await retryTableDiscordNotification(id);
      queryClient.setQueryData(queryKey, result);
      showToast({ kind: 'success', message: 'Discord 알림을 다시 전송했어요.' });
    } catch (cause) {
      showToast({
        kind: 'error',
        message: cause instanceof Error ? cause.message : '재전송하지 못했어요.',
      });
    } finally {
      setPending(false);
    }
  };
  const label = notification
    ? {
        pending: '전송 대기',
        sending: '전송 중',
        sent: '전송 완료',
        failed: '전송 실패',
      }[notification.status]
    : '';
  return (
    <details
      onToggle={(event) => setExpanded(event.currentTarget.open)}
      className="rounded-lg border border-[#e2d8cb] px-3 py-2 text-xs text-[#6b7280]"
    >
      <summary className="min-h-11 cursor-pointer content-center font-medium">
        Discord 알림 상태 확인
      </summary>
      {expanded ? (
        <div className="flex flex-col gap-2 py-2" aria-live="polite">
          {error ? (
            <div className="flex items-center gap-2 text-[#963f38]">
              <span>
                {error instanceof ApiError && error.status === 404
                  ? 'Discord 알림 데이터 없음'
                  : '알림 상태를 불러오지 못했어요.'}
              </span>
              <button
                type="button"
                disabled={isFetching}
                onClick={() => void refetch()}
                className="min-h-11 px-2 underline"
              >
                다시 확인
              </button>
            </div>
          ) : null}
          {!notification && isFetching ? <p>알림 상태를 확인하는 중…</p> : null}
          {notification ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span>Discord · {label}</span>
                {notification.status === 'failed' ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void retry()}
                    className="min-h-11 px-2 font-semibold text-[#963f38] underline disabled:opacity-50"
                  >
                    {pending ? '재전송 중…' : '재전송'}
                  </button>
                ) : null}
              </div>
              {notification.status === 'failed' ? (
                <p className="break-all text-[#963f38]">
                  {notification.last_error ?? '오류 정보 없음'} · {notification.attempt_count}회
                  시도
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </details>
  );
};

const HistoryView = ({
  filters,
  history,
  onFilters,
  onSubmit,
  onPage,
}: {
  filters: HistoryFilters;
  history: OrderPaginated | null;
  onFilters: (filters: HistoryFilters) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onPage: (page: number) => void;
}) => (
  <section>
    <Panel>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input
          type="number"
          min="1"
          placeholder="테이블 번호"
          value={filters.tableNumber}
          onChange={(event) => onFilters({ ...filters, tableNumber: event.target.value })}
          className="rounded-lg border border-[#d7cec2] bg-white px-3 py-2 text-sm"
        />
        <select
          value={filters.pos}
          onChange={(event) => onFilters({ ...filters, pos: event.target.value })}
          className="rounded-lg border border-[#d7cec2] bg-white px-3 py-2 text-sm"
        >
          <option value="">포스 전체</option>
          <option value="true">등록 완료</option>
          <option value="false">미등록</option>
        </select>
        <input
          type="date"
          aria-label="조회 시작일"
          value={filters.from}
          onChange={(event) => onFilters({ ...filters, from: event.target.value })}
          className="rounded-lg border border-[#d7cec2] bg-white px-3 py-2 text-sm"
        />
        <input
          type="date"
          aria-label="조회 종료일"
          value={filters.to}
          onChange={(event) => onFilters({ ...filters, to: event.target.value })}
          className="rounded-lg border border-[#d7cec2] bg-white px-3 py-2 text-sm"
        />
        <button className="rounded-lg bg-[#2f2924] px-4 py-2 text-sm font-semibold text-white">
          조회
        </button>
      </form>
    </Panel>
    <div className="mt-4 space-y-3">
      {history?.items.length === 0 ? (
        <Panel>조건에 맞는 주문 이력이 없어요.</Panel>
      ) : (
        history?.items.map((order) => (
          <Panel key={order.id}>
            <div className="flex justify-between gap-3">
              <div>
                <p className="text-xs text-[#876a51]">
                  {order.table_number === null ? '테이블 관리자' : `Table ${order.table_number}`} ·{' '}
                  {formatDateTime(order.created_at)}
                </p>
                <h3 className="mt-1 font-semibold">주문 {order.id.slice(0, 8)}</h3>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatWon(order.total_amount)}</p>
                <p className="mt-1 text-xs text-[#6b7280]">
                  {order.is_pos_registered ? '✓ 포스 등록' : '! 포스 미등록'}
                </p>
              </div>
            </div>
            <OrderItems order={order} />
          </Panel>
        ))
      )}
    </div>
    {history && history.total > history.limit ? (
      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          type="button"
          disabled={history.page <= 1}
          onClick={() => onPage(history.page - 1)}
          className="rounded-lg border border-[#d7cec2] bg-white px-3 py-2 text-sm disabled:opacity-40"
        >
          이전
        </button>
        <span className="text-sm">
          {history.page} / {Math.ceil(history.total / history.limit)}
        </span>
        <button
          type="button"
          disabled={history.page >= Math.ceil(history.total / history.limit)}
          onClick={() => onPage(history.page + 1)}
          className="rounded-lg border border-[#d7cec2] bg-white px-3 py-2 text-sm disabled:opacity-40"
        >
          다음
        </button>
      </div>
    ) : null}
  </section>
);

const SettingsView = ({
  mode,
  pending,
  onToggle,
}: {
  mode: OrderMode | null;
  pending: boolean;
  onToggle: () => void;
}) => (
  <Panel className="max-w-xl">
    <p className="text-xs font-semibold tracking-wide text-[#876a51]">ORDER MODE</p>
    <div className="mt-3 flex items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold">
          {mode?.is_order_enabled ? '주문 가능' : '메뉴판 전용'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6b7280]">
          {mode?.is_order_enabled
            ? '고객이 테이블에 입장하고 주문할 수 있습니다.'
            : '고객은 메뉴만 둘러볼 수 있고 장바구니는 유지됩니다.'}
        </p>
        {mode ? (
          <p className="mt-2 text-xs text-[#9ca3af]">
            마지막 변경 {formatDateTime(mode.updated_at)}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        disabled={!mode || pending}
        onClick={onToggle}
        className="shrink-0 rounded-xl bg-[#2f2924] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? '변경 중…' : mode?.is_order_enabled ? '주문 중지' : '주문 시작'}
      </button>
    </div>
  </Panel>
);

const CheckoutModal = ({
  table,
  checked,
  pending,
  onChecked,
  onClose,
  onConfirm,
}: {
  table: ActiveTableOrders;
  checked: boolean;
  pending: boolean;
  onChecked: (value: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  const blocked = table.unregistered_order_count > 0;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        className="w-full max-w-md rounded-3xl bg-[#faf6f0] p-6 shadow-2xl"
      >
        <h2 id="checkout-title" className="text-xl font-semibold">
          {table.table_number === null ? '테이블 관리자' : `${table.table_number}번 테이블`}{' '}
          체크아웃
        </h2>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="주문" value={`${table.order_count}건`} />
          <Stat label="누적" value={formatWon(table.total_amount)} />
          <Stat label="미등록" value={`${table.unregistered_order_count}건`} warning={blocked} />
        </dl>
        {blocked ? (
          <p role="alert" className="mt-4 rounded-xl bg-[#fff0dc] p-3 text-sm text-[#8b5618]">
            포스 미등록 주문을 모두 등록한 뒤 체크아웃해 주세요.
          </p>
        ) : (
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-[#d7cec2] bg-white p-4 text-sm">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => onChecked(event.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span>결제가 완료되었는지 확인했습니다.</span>
          </label>
        )}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-xl border border-[#d7cec2] bg-white font-semibold"
          >
            취소
          </button>
          <button
            type="button"
            disabled={blocked || !checked || pending}
            onClick={onConfirm}
            className="min-h-11 flex-1 rounded-xl bg-[#8b3e35] font-semibold text-white disabled:opacity-40"
          >
            {pending ? '처리 중…' : '체크아웃'}
          </button>
        </div>
      </section>
    </div>
  );
};

export default AdminOrdersPageView;
