import Link from 'next/link';

import MenuManageClient from '@/components/admin/menuManageClient';

const AdminManageMenuPageView = () => {
  return (
    <main className="min-h-dvh bg-[radial-gradient(120%_90%_at_50%_0%,#fcf8f2_0%,#f3ece2_56%,#ece2d6_100%)] text-[#1f2937]">
      <div className="mx-auto w-full max-w-4xl px-4 pt-10 pb-16 sm:px-6">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.22em] text-[#876a51]">ADMIN / MANAGE</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">메뉴 검색/수정/삭제</h1>
            <p className="mt-2 text-sm text-[#4b5563]">
              검색과 카테고리 필터로 메뉴를 찾고, 빠른 토글 또는 상세 수정으로 변경할 수 있어요.
            </p>
          </div>
          <Link
            href="/admin/menu"
            prefetch={false}
            className="rounded-lg border border-[#d7cec2] bg-[#f8f3ec] px-3 py-2 text-sm"
          >
            관리자 홈
          </Link>
        </header>

        <MenuManageClient />
      </div>
    </main>
  );
};

export default AdminManageMenuPageView;
