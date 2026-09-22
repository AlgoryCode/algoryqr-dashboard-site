import {
  formatUberEatsAmount,
  productAvailabilityClass,
  productAvailabilityLabel,
  UBER_EATS_SOFT_CARD_CLASS,
} from "@/lib/ubereats-ui";
import type { UberEatsProduct } from "@/lib/ubereats-api";

type UberEatsProductCardProps = {
  product: UberEatsProduct;
  onEdit: () => void;
};

export function UberEatsProductCard({ product, onEdit }: UberEatsProductCardProps) {
  const groupNames = (product.modifierGroups ?? []).map((group) => group.name.trim()).filter(Boolean);

  return (
    <button
      type="button"
      onClick={onEdit}
      className={`${UBER_EATS_SOFT_CARD_CLASS} w-full p-4 text-left transition-colors hover:border-foreground/30`}
    >
      <div className="flex gap-3">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl border border-border object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-xs text-muted-foreground">
            Görsel yok
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-medium text-foreground">{product.name || "İsimsiz ürün"}</p>
            <p className="shrink-0 text-sm font-semibold text-foreground">
              {formatUberEatsAmount(product.price, product.currency ?? "TRY")}
            </p>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${productAvailabilityClass(product.available)}`}
            >
              {productAvailabilityLabel(product.available)}
            </span>
            <span className="text-xs text-muted-foreground">Düzenle</span>
          </div>
          {product.description ? (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
          ) : null}
          {groupNames.length > 0 ? (
            <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{groupNames.join(" · ")}</p>
          ) : null}
        </div>
      </div>
    </button>
  );
}
