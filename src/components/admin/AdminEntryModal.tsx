'use client';

import { useEffect, useRef, useState } from 'react';

import { setToken } from '@/lib/token';
import { loginAdmin } from '@/services/auth.service';
import { enterAdminTable } from '@/services/order.service';

import type { EnterTableResponse } from '@/types/order';

const AdminEntryModal = ({
  onClose,
  onEnter,
}: {
  onClose: () => void;
  onEnter: (session: EnterTableResponse) => void;
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const fields = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    try {
      const login = await loginAdmin({
        email: String(fields.get('email')),
        password: String(fields.get('password')),
      });
      setToken(login.access_token);
      onEnter(await enterAdminTable());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '관리자로 입장하지 못했어요.');
    } finally {
      setPending(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="admin-entry-title"
      onCancel={(event) => {
        if (pending) event.preventDefault();
        else onClose();
      }}
      className="fixed inset-0 h-full max-h-none w-full max-w-none bg-transparent p-4 backdrop:bg-[#2f2924]/45 backdrop:backdrop-blur-sm open:grid open:place-items-center"
    >
      <section className="flex w-full max-w-sm flex-col gap-5 rounded-3xl border border-[#ded3c6] bg-[#faf6f0] p-6 text-[#1f2937] shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <h2 id="admin-entry-title" className="text-xl font-semibold">
            관리자 로그인
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="닫기"
            className="grid h-10 w-10 place-items-center rounded-full text-xl"
          >
            ×
          </button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-2 text-sm">
            이메일
            <input
              autoFocus
              name="email"
              type="email"
              autoComplete="username"
              required
              className="min-h-12 rounded-xl border border-[#cdbca9] bg-white px-3"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            비밀번호
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="min-h-12 rounded-xl border border-[#cdbca9] bg-white px-3"
            />
          </label>
          {error ? (
            <p role="alert" className="rounded-lg bg-[#f8e8e5] p-3 text-sm text-[#963f38]">
              {error}
            </p>
          ) : null}
          <button
            disabled={pending}
            className="min-h-12 rounded-xl bg-[#2f2924] font-semibold text-white disabled:opacity-50"
          >
            {pending ? '확인하는 중…' : '관리자로 입장'}
          </button>
        </form>
      </section>
    </dialog>
  );
};

export default AdminEntryModal;
