import Link from 'next/link';

import AdminPageHeader from '@/components/admin/AdminPageHeader';

const AdminRecipePageView = () => {
  return (
    <main className="min-h-dvh bg-[radial-gradient(120%_90%_at_50%_0%,#fcf8f2_0%,#f3ece2_56%,#ece2d6_100%)] text-[#1f2937]">
      <div className="mx-auto w-full max-w-4xl px-4 pt-10 pb-16 sm:px-6">
        <AdminPageHeader
          title="Recipe Admin"
          description="레시피 추가와 기존 레시피 관리를 분리해 운영하기 쉽게 구성했습니다."
        />

        <section className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/recipe/add"
            prefetch={false}
            className="rounded-2xl border border-[#e2d8cb] bg-[#f8f3ec] p-5 transition hover:shadow-[0_10px_24px_rgba(120,84,52,0.12)]"
          >
            <p className="text-xs font-semibold tracking-wide text-[#876a51]">CREATE</p>
            <h2 className="mt-2 text-xl font-semibold">레시피 추가</h2>
            <p className="mt-2 text-sm text-[#4b5563]">
              메뉴에 연결할 새 칵테일 레시피를 등록합니다.
            </p>
          </Link>

          <Link
            href="/admin/recipe/manage"
            prefetch={false}
            className="rounded-2xl border border-[#e2d8cb] bg-[#f8f3ec] p-5 transition hover:shadow-[0_10px_24px_rgba(120,84,52,0.12)]"
          >
            <p className="text-xs font-semibold tracking-wide text-[#876a51]">MANAGE</p>
            <h2 className="mt-2 text-xl font-semibold">레시피 관리</h2>
            <p className="mt-2 text-sm text-[#4b5563]">
              검색으로 레시피를 찾아 수정 또는 삭제합니다.
            </p>
          </Link>
        </section>
      </div>
    </main>
  );
};

export default AdminRecipePageView;
