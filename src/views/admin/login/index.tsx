'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { showToast } from '@/components/sonner';
import { setToken } from '@/lib/token';
import { loginAdmin } from '@/services/auth.service';

import type { LoginFormData } from '@/types/auth';

const AdminLoginPageView = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const router = useRouter();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await loginAdmin(formData);

      setToken(res.access_token);

      showToast({
        kind: 'success',
        message: '로그인에 성공했어요',
      });

      router.replace('/admin');
    } catch (error) {
      const message = error instanceof Error ? error.message : '로그인에 실패했어요.';
      setErrorMessage(message);
      showToast({
        kind: 'error',
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-[radial-gradient(120%_90%_at_50%_0%,#fcf8f2_0%,#f3ece2_56%,#ece2d6_100%)] text-[#1f2937]">
      <div className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4 py-10 sm:px-6">
        <section className="w-full rounded-2xl border border-[#e2d8cb] bg-[#f8f3ec] p-6">
          <p className="text-xs font-medium tracking-[0.22em] text-[#876a51]">ADMIN LOGIN</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Menu Admin</h1>
          <p className="mt-2 text-sm text-[#4b5563]">관리자 계정으로 로그인해 주세요.</p>

          <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
            <input
              name="email"
              placeholder="이메일"
              value={formData.email}
              onChange={handleChange}
              className="rounded-lg border border-[#d7cec2] bg-white px-3 py-2"
              required
            />
            <input
              name="password"
              type="password"
              placeholder="비밀번호"
              value={formData.password}
              onChange={handleChange}
              className="rounded-lg border border-[#d7cec2] bg-white px-3 py-2"
              required
            />
            {errorMessage ? (
              <p role="alert" className="rounded-lg bg-[#f8e8e5] px-3 py-2 text-sm text-[#963f38]">
                {errorMessage}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[#1f2937] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isSubmitting ? '로그인 중…' : '로그인'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
};

export default AdminLoginPageView;
