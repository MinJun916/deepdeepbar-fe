import Link from 'next/link';

import MenuAddForm from '@/components/admin/menuAddForm';

const AdminAddMenuPageView = () => {
  return (
    <main className="min-h-dvh bg-[radial-gradient(120%_90%_at_50%_0%,#fcf8f2_0%,#f3ece2_56%,#ece2d6_100%)] text-[#1f2937]">
      <div className="mx-auto w-full max-w-3xl px-4 pt-10 pb-16 sm:px-6">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-[0.22em] text-[#876a51]">ADMIN / ADD</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">메뉴 추가</h1>
          </div>
          <Link
            href="/admin/menu"
            prefetch={false}
            className="rounded-lg border border-[#d7cec2] bg-[#f8f3ec] px-3 py-2 text-sm"
          >
            관리자 홈
          </Link>
        </header>

        <MenuAddForm />
      </div>
    </main>
  );
};

export default AdminAddMenuPageView;
