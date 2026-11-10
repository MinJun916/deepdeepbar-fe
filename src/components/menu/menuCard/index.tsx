import type { Menu } from '@/types/menu';

type MenuCardProps = {
  menu: Menu;
  currency: Intl.NumberFormat;
  onSelect?: () => void;
};

const MenuCard = ({ menu, currency, onSelect }: MenuCardProps) => {
  const sortedPrices = [...(menu.prices ?? [])].sort((a, b) => a.display_order - b.display_order);

  const formatPriceLabel = (priceType: string) => {
    if (priceType === 'default') return '';
    if (priceType === 'shot') return '샷';
    if (priceType === 'bottle') return '보틀';
    return priceType;
  };

  return (
    <article
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (onSelect && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onSelect();
        }
      }}
      className="group cursor-pointer rounded-2xl border border-[#e0d5c8] bg-[linear-gradient(160deg,rgba(252,248,242,0.96)_0%,rgba(245,238,229,0.96)_100%)] p-4 shadow-[0_8px_22px_rgba(59,47,36,0.07)] transition hover:border-[#cdbca9] hover:shadow-[0_14px_28px_rgba(59,47,36,0.11)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#876a51] motion-safe:hover:-translate-y-0.5 sm:p-5"
      aria-label={`${menu.name} 상세 및 옵션 보기`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg leading-6 font-semibold tracking-tight text-[#111827]">
              {menu.name}
            </h2>
            {menu.is_signature ? (
              <span className="rounded-full border border-[#d3b391] bg-[#f4e6d8] px-2.5 py-1 text-[11px] font-semibold text-[#5a3d26]">
                SIGNATURE
              </span>
            ) : null}
            {menu.is_sold_out ? (
              <span className="rounded-full border border-[#d1d5db] bg-[#f3f4f6] px-2.5 py-1 text-[11px] font-semibold text-[#6b7280]">
                SOLD OUT
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs font-medium tracking-wide text-[#6b7280]">{menu.name_en}</p>
        </div>
        {sortedPrices.length > 0 ? (
          <div className="shrink-0 text-right">
            {sortedPrices.map((price) => {
              const label = formatPriceLabel(price.price_type);

              return (
                <p
                  key={`${menu.id}-${price.price_type}`}
                  className="text-sm font-semibold text-[#374151]"
                >
                  {label
                    ? `${label} ${currency.format(price.price)}원`
                    : `${currency.format(price.price)}원`}
                </p>
              );
            })}
          </div>
        ) : (
          <p className="shrink-0 text-sm font-semibold text-[#6b7280]">가격 문의</p>
        )}
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-6 break-keep text-[#4b5563]">
        {menu.description}
      </p>
      <div className="mt-4 flex items-center justify-end border-t border-[#e2d8cb] pt-3 text-xs font-semibold text-[#876a51]">
        <span>{menu.is_sold_out ? '상세 보기' : '옵션 선택'}</span>
        <span
          className="ml-1 transition-transform motion-safe:group-hover:translate-x-0.5"
          aria-hidden="true"
        >
          →
        </span>
      </div>
    </article>
  );
};

export default MenuCard;
