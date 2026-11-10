'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import AdminPageHeader from '@/components/admin/AdminPageHeader';
import {
  createStaffCallOption,
  deleteStaffCallOption,
  getStaffCallOptions,
  updateStaffCallOption,
} from '@/services/staff-call.service';

import type { StaffCallOption, StaffCallOptionInput } from '@/types/staff-call';

const buttonClass =
  'min-h-11 rounded-xl border border-[#d7cec2] px-4 text-sm font-semibold active:bg-[#e8dccd] disabled:opacity-50';

const OptionForm = ({
  option,
  disabled,
  onSave,
  onDelete,
}: {
  option?: StaffCallOption;
  disabled: boolean;
  onSave: (input: StaffCallOptionInput) => Promise<boolean>;
  onDelete?: () => void;
}) => (
  <form
    onSubmit={async (event) => {
      event.preventDefault();
      if (disabled) return;
      const form = event.currentTarget;
      const fields = new FormData(form);
      const saved = await onSave({
        label: String(fields.get('label')).trim(),
        is_active: fields.get('is_active') === 'on',
        display_order: Number(fields.get('display_order')),
      });
      if (saved && !option) form.reset();
    }}
  >
    <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
        <label className="flex min-w-0 flex-col gap-2 text-sm font-medium">
          호출 문구
          <input
            name="label"
            defaultValue={option?.label ?? ''}
            required
            maxLength={80}
            pattern=".*\S.*"
            placeholder="예: 💧 물 주세요!"
            className="min-h-12 min-w-0 rounded-xl border border-[#cdbca9] bg-white px-3"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          표시 순서
          <input
            name="display_order"
            type="number"
            min={0}
            max={999}
            step={1}
            required
            defaultValue={option?.display_order ?? 0}
            className="min-h-12 min-w-0 rounded-xl border border-[#cdbca9] bg-white px-3"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            name="is_active"
            type="checkbox"
            defaultChecked={option?.is_active ?? true}
            className="h-5 w-5 accent-[#705039]"
          />
          메뉴판에 표시
        </label>
        <div className="flex gap-2">
          {onDelete ? (
            <button type="button" onClick={onDelete} className={`${buttonClass} text-[#963f38]`}>
              삭제
            </button>
          ) : null}
          <button type="submit" className={`${buttonClass} bg-[#2f2924] text-white`}>
            {disabled ? '처리 중…' : option ? '저장' : '항목 추가'}
          </button>
        </div>
      </div>
    </fieldset>
  </form>
);

const StaffCallsAdminView = () => {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const optionsQuery = useQuery({
    queryKey: ['staff-call-options', 'admin'],
    staleTime: 60_000,
    queryFn: ({ signal }) => getStaffCallOptions(true, signal),
  });

  const save = async (input: StaffCallOptionInput, id?: string) => {
    if (pending) return false;
    setPending(true);
    setError('');
    setMessage('');
    try {
      const saved = id
        ? await updateStaffCallOption(id, input)
        : await createStaffCallOption(input);
      queryClient.setQueryData<StaffCallOption[]>(['staff-call-options', 'admin'], (current) =>
        [...(current ?? []).filter((option) => option.id !== saved.id), saved].sort(
          (a, b) => a.display_order - b.display_order || a.label.localeCompare(b.label, 'ko'),
        ),
      );
      void queryClient.invalidateQueries({ queryKey: ['staff-call-options'] });
      setMessage('호출 항목을 저장했어요.');
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '저장하지 못했어요. 다시 시도해 주세요.');
      return false;
    } finally {
      setPending(false);
    }
  };

  const remove = async (id: string) => {
    if (pending) return;
    setPending(true);
    setError('');
    setMessage('');
    try {
      await deleteStaffCallOption(id);
      queryClient.setQueryData<StaffCallOption[]>(['staff-call-options', 'admin'], (current) =>
        (current ?? []).filter((option) => option.id !== id),
      );
      void queryClient.invalidateQueries({ queryKey: ['staff-call-options'] });
      setMessage('호출 항목을 삭제했어요. 기존 호출 내역은 유지됩니다.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '삭제하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="grid min-h-dvh justify-items-center bg-[radial-gradient(120%_90%_at_50%_0%,#fcf8f2_0%,#f3ece2_56%,#ece2d6_100%)] text-[#1f2937]">
      <div className="grid w-full gap-5 justify-self-center px-4 py-10 sm:px-6 lg:max-w-3xl">
        <AdminPageHeader
          title="직원 호출 관리"
          description="호출 문구와 표시 여부, 순서를 관리합니다."
        />
        <Link href="/admin" className="flex min-h-11 items-center text-sm text-[#705039]">
          ← 관리자 홈
        </Link>
        {error ? (
          <p role="alert" className="rounded-xl bg-[#f8e8e5] p-4 text-sm text-[#963f38]">
            {error}
          </p>
        ) : null}
        {message ? (
          <p role="status" className="rounded-xl bg-[#e7eee3] p-4 text-sm text-[#395334]">
            {message}
          </p>
        ) : null}
        <section className="grid gap-4 rounded-2xl border border-[#e2d8cb] bg-[#f8f3ec] p-5">
          <h2 className="text-lg font-semibold">새 호출 항목</h2>
          <OptionForm disabled={pending} onSave={(input) => save(input)} />
        </section>
        <section className="grid gap-4" aria-labelledby="staff-call-options-title">
          <div className="grid gap-1">
            <h2 id="staff-call-options-title" className="text-lg font-semibold">
              호출 항목
            </h2>
            <p className="text-sm text-[#6b7280]">
              표시 순서가 작을수록 먼저 보여요. 숨긴 항목은 새로 요청할 수 없어요.
            </p>
          </div>
          {optionsQuery.isPending ? <p role="status">호출 항목을 불러오는 중…</p> : null}
          {optionsQuery.isError ? (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-3 rounded-xl bg-[#f8e8e5] p-4 text-sm text-[#963f38]"
            >
              항목을 새로 불러오지 못했어요.
              <button onClick={() => void optionsQuery.refetch()} className={buttonClass}>
                다시 시도
              </button>
            </div>
          ) : null}
          {optionsQuery.data?.length === 0 ? (
            <p className="rounded-xl bg-white p-5 text-sm text-[#6b7280]">
              등록된 호출 항목이 없어요. 위에서 추가해 주세요.
            </p>
          ) : null}
          {optionsQuery.data?.map((option) => (
            <article
              key={`${option.id}:${option.label}:${option.is_active}:${option.display_order}`}
              className="rounded-2xl border border-[#e2d8cb] bg-[#f8f3ec] p-5"
            >
              <OptionForm
                option={option}
                disabled={pending}
                onSave={(input) => save(input, option.id)}
                onDelete={() => void remove(option.id)}
              />
            </article>
          ))}
        </section>
      </div>
    </main>
  );
};

export default StaffCallsAdminView;
