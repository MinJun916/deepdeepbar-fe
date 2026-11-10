'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { showToast } from '@/components/sonner';
import { ApiError } from '@/lib/axios';
import { getTableSessionToken } from '@/lib/tableSession';
import { enterTable } from '@/services/order.service';
import {
  createStaffCall,
  getCurrentStaffCalls,
  getStaffCallOptions,
} from '@/services/staff-call.service';

import type { EnterTableResponse, TableSession } from '@/types/order';
import type { StaffCall } from '@/types/staff-call';

const StaffCallDialog = ({
  session,
  onEntered,
  onExpired,
  onClose,
}: {
  session: TableSession | null;
  onEntered: (session: EnterTableResponse) => void;
  onExpired: (token: string) => void;
  onClose: () => void;
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const busyRef = useRef(false);
  const [selectedId, setSelectedId] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const token = session ? getTableSessionToken() : null;
  const callsKey = ['staff-calls', token];
  const options = useQuery({
    queryKey: ['staff-call-options'],
    staleTime: 60_000,
    queryFn: ({ signal }) => getStaffCallOptions(false, signal),
  });
  const calls = useQuery({
    queryKey: callsKey,
    queryFn: ({ signal }) => getCurrentStaffCalls(token!, signal),
    enabled: Boolean(token),
    refetchInterval: 5000,
    retry: false,
  });
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  useEffect(() => {
    if (token && calls.error instanceof ApiError && calls.error.status === 401) onExpired(token);
  }, [calls.error, onExpired, token]);

  const activeCall = calls.data?.find(
    (call) => call.option_id === selectedId && !call.completed_at,
  );
  const waiting = activeCall && !activeCall.retry_available;
  const activeOptions = options.data ?? [];
  const selectedOption = activeOptions.find((option) => option.id === selectedId);
  const enter = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busyRef.current) return;
    const tableNumber = Number(new FormData(event.currentTarget).get('table_number'));
    if (!Number.isInteger(tableNumber) || tableNumber < 1) {
      setError('1 이상의 테이블 번호를 입력해 주세요.');
      return;
    }
    busyRef.current = true;
    setPending(true);
    setError('');
    try {
      onEntered(await enterTable(tableNumber));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '테이블을 확인하지 못했어요.');
    } finally {
      busyRef.current = false;
      setPending(false);
    }
  };
  const send = async () => {
    if (!token || !selectedOption || busyRef.current) return;
    if (waiting) {
      showToast({ kind: 'info', message: '이미 접수된 요청이에요. 직원이 확인하고 있어요.' });
      onClose();
      return;
    }
    busyRef.current = true;
    setPending(true);
    setError('');
    try {
      const result = await createStaffCall(token, selectedId);
      queryClient.setQueryData<StaffCall[]>(callsKey, (current = []) => [
        result,
        ...current.filter((call) => call.id !== result.id),
      ]);
      if (result.notification_status === 'failed') {
        setError('직원에게 전달하지 못했어요. 다시 보내기를 눌러 주세요.');
      } else {
        showToast({
          kind: 'success',
          message:
            result.notification_status === 'sent' ? '직원에게 전달했어요.' : '요청을 접수했어요.',
        });
        onClose();
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onExpired(token);
      setError(
        cause instanceof Error ? cause.message : '요청을 보내지 못했어요. 다시 시도해 주세요.',
      );
    } finally {
      busyRef.current = false;
      setPending(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="staff-call-title"
      onCancel={(event) => {
        if (pending) event.preventDefault();
        else onClose();
      }}
      className="fixed inset-0 h-full max-h-none w-full max-w-none bg-transparent p-4 backdrop:bg-[#2f2924]/45 backdrop:backdrop-blur-sm open:grid open:items-end open:justify-items-center sm:open:items-center"
    >
      <section className="flex max-h-[85dvh] w-full max-w-md flex-col gap-5 overflow-y-auto rounded-3xl border border-[#ded3c6] bg-[#faf6f0] p-6 text-[#2f2924] shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="staff-call-title" className="text-xl font-semibold tracking-tight">
              무엇을 도와드릴까요?
            </h2>
            <p className="text-sm text-[#745e4d]">
              {session
                ? `테이블 ${session.table_number ?? '관리자'} · 직원 호출`
                : '직원이 찾아갈 테이블 번호를 알려주세요.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="직원 호출 닫기"
            className="grid min-h-11 min-w-11 place-items-center rounded-full bg-[#eee5d9] text-xl disabled:opacity-50 motion-safe:active:scale-95"
          >
            ×
          </button>
        </div>
        {!session ? (
          <form onSubmit={enter} className="flex flex-col gap-3">
            <label className="flex flex-col gap-2 text-sm font-medium">
              테이블 번호
              <input
                name="table_number"
                autoFocus
                inputMode="numeric"
                pattern="[0-9]+"
                required
                placeholder="예: 21"
                className="min-h-12 rounded-xl border border-[#cdbca9] bg-white px-4 text-base"
              />
            </label>
            <button
              disabled={pending}
              className="min-h-12 rounded-xl bg-[#2f2924] px-4 font-semibold text-white disabled:opacity-50 motion-safe:active:scale-[0.98]"
            >
              {pending ? '확인하는 중…' : '테이블 확인'}
            </button>
          </form>
        ) : (
          <>
            {options.isPending ? (
              <p role="status" className="text-sm">
                호출 항목을 불러오고 있어요…
              </p>
            ) : null}
            {options.isError ? (
              <div className="flex items-center justify-between gap-3 text-sm text-[#963f38]">
                <p>호출 항목을 새로 불러오지 못했어요.</p>
                <button
                  type="button"
                  onClick={() => void options.refetch()}
                  className="min-h-11 shrink-0 px-3 underline"
                >
                  다시 시도
                </button>
              </div>
            ) : null}
            {!options.isPending && !options.isError && activeOptions.length === 0 ? (
              <p className="text-sm text-[#745e4d]">
                지금은 등록된 호출 항목이 없어요. 직원을 직접 불러 주세요.
              </p>
            ) : null}
            <fieldset disabled={pending} className="flex flex-col gap-2">
              <legend className="sr-only">요청할 내용을 선택해 주세요</legend>
              {activeOptions.map((option) => {
                const call = calls.data?.find(
                  (item) => item.option_id === option.id && !item.completed_at,
                );
                return (
                  <label
                    key={option.id}
                    className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 active:bg-[#eadbc8] ${selectedId === option.id ? 'border-[#876a51] bg-[#eee0cf]' : 'border-[#e2d8cb] bg-white'}`}
                  >
                    <input
                      type="radio"
                      name="staff-call-option"
                      value={option.id}
                      checked={selectedId === option.id}
                      onChange={() => {
                        setSelectedId(option.id);
                        setError('');
                      }}
                      className="h-4 w-4 shrink-0 accent-[#745239]"
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="font-medium break-words">{option.label}</span>
                      {call ? (
                        <span className="text-xs text-[#745e4d]">
                          {call.retry_available
                            ? '다시 보낼 수 있어요'
                            : call.notification_status === 'sent'
                              ? '직원에게 전달했어요'
                              : '전달하는 중…'}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </fieldset>
            {calls.isError ? (
              <p role="alert" className="text-sm text-[#963f38]">
                요청 상태를 확인하지 못했어요. 다시 확인한 후 보내 주세요.
                <button
                  type="button"
                  onClick={() => void calls.refetch()}
                  className="min-h-11 px-3 underline"
                >
                  다시 확인
                </button>
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => void send()}
              disabled={pending || !selectedOption || calls.isPending || calls.isError}
              className="min-h-13 rounded-xl bg-[#2f2924] px-4 font-semibold text-white disabled:bg-[#ded5ca] disabled:text-[#817365] motion-safe:active:scale-[0.98]"
            >
              {pending
                ? '보내는 중…'
                : waiting
                  ? '접수된 요청 확인'
                  : activeCall?.retry_available
                    ? '다시 보내기'
                    : '요청 보내기'}
            </button>
          </>
        )}
        {error ? (
          <p role="alert" className="rounded-xl bg-[#f8e8e5] p-3 text-sm text-[#963f38]">
            {error}
          </p>
        ) : null}
      </section>
    </dialog>
  );
};

export default StaffCallDialog;
