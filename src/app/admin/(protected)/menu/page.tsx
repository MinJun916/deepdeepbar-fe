import Link from 'next/link';

import AdminPageHeader from '@/components/admin/AdminPageHeader';

const AdminMenuPage = () => {
  return (
    <main className="min-h-dvh bg-[radial-gradient(120%_90%_at_50%_0%,#fcf8f2_0%,#f3ece2_56%,#ece2d6_100%)] text-[#1f2937]">
      <div className="mx-auto w-full max-w-4xl px-4 pt-10 pb-16 sm:px-6">
        <AdminPageHeader
          title="Menu Admin"
          description="메뉴 추가와 기존 메뉴 관리를 분리해 운영하기 쉽게 구성했습니다."
        />

        <section className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/menu/add"
            prefetch={false}
            className="rounded-2xl border border-[#e2d8cb] bg-[#f8f3ec] p-5 transition hover:shadow-[0_10px_24px_rgba(120,84,52,0.12)]"
          >
            <p className="text-xs font-semibold tracking-wide text-[#876a51]">CREATE</p>
            <h2 className="mt-2 text-xl font-semibold">메뉴 추가</h2>
            <p className="mt-2 text-sm text-[#4b5563]">
              새 칵테일/위스키/사이드 메뉴를 등록합니다.
            </p>
          </Link>

          <Link
            href="/admin/menu/manage"
            prefetch={false}
            className="rounded-2xl border border-[#e2d8cb] bg-[#f8f3ec] p-5 transition hover:shadow-[0_10px_24px_rgba(120,84,52,0.12)]"
          >
            <p className="text-xs font-semibold tracking-wide text-[#876a51]">MANAGE</p>
            <h2 className="mt-2 text-xl font-semibold">메뉴 관리</h2>
            <p className="mt-2 text-sm text-[#4b5563]">
              검색/카테고리 필터로 메뉴를 찾아 수정 또는 삭제합니다.
            </p>
          </Link>
        </section>
      </div>
    </main>
  );
};

export default AdminMenuPage;
