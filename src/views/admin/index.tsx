import Link from 'next/link';

import AdminPageHeader from '@/components/admin/AdminPageHeader';

const AdminPageView = () => {
  return (
    <main className="min-h-dvh bg-[radial-gradient(120%_90%_at_50%_0%,#fcf8f2_0%,#f3ece2_56%,#ece2d6_100%)] text-[#1f2937]">
      <div className="mx-auto w-full max-w-4xl px-4 pt-10 pb-16 sm:px-6">
        <AdminPageHeader
          title="Admin"
          description="매장 운영과 메뉴·레시피 관리를 선택할 수 있습니다."
        />

        <section className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/orders"
            prefetch={false}
            className="rounded-2xl border border-[#cdbca9] bg-[#f3e5d6] p-5 transition hover:shadow-[0_10px_24px_rgba(120,84,52,0.12)] sm:col-span-2"
          >
            <p className="text-xs font-semibold tracking-wide text-[#876a51]">STORE OPERATIONS</p>
            <h2 className="mt-2 text-xl font-semibold">주문·테이블 운영</h2>
            <p className="mt-2 text-sm text-[#4b5563]">
              활성 테이블, 포스 등록, 체크아웃과 주문 모드를 관리합니다.
            </p>
          </Link>
          <Link
            href="/admin/menu"
            prefetch={false}
            className="rounded-2xl border border-[#e2d8cb] bg-[#f8f3ec] p-5 transition hover:shadow-[0_10px_24px_rgba(120,84,52,0.12)]"
          >
            <p className="text-xs font-semibold tracking-wide text-[#876a51]">MENU</p>
            <h2 className="mt-2 text-xl font-semibold">메뉴 관리</h2>
            <p className="mt-2 text-sm text-[#4b5563]">메뉴 추가/수정/삭제를 진행합니다.</p>
          </Link>

          <Link
            href="/admin/recipe"
            prefetch={false}
            className="rounded-2xl border border-[#e2d8cb] bg-[#f8f3ec] p-5 transition hover:shadow-[0_10px_24px_rgba(120,84,52,0.12)]"
          >
            <p className="text-xs font-semibold tracking-wide text-[#876a51]">RECIPE</p>
            <h2 className="mt-2 text-xl font-semibold">레시피 관리</h2>
            <p className="mt-2 text-sm text-[#4b5563]">칵테일 레시피를 관리합니다.</p>
          </Link>
          <Link
            href="/admin/staff-calls"
            prefetch={false}
            className="flex flex-col gap-2 rounded-2xl border border-[#e2d8cb] bg-[#f8f3ec] p-5 transition hover:shadow-[0_10px_24px_rgba(120,84,52,0.12)]"
          >
            <p className="text-xs font-semibold tracking-wide text-[#876a51]">STAFF CALLS</p>
            <h2 className="text-xl font-semibold">직원 호출 관리</h2>
            <p className="text-sm text-[#4b5563]">
              호출 항목의 문구, 표시 여부와 순서를 관리합니다.
            </p>
          </Link>
        </section>
      </div>
    </main>
  );
};

export default AdminPageView;
