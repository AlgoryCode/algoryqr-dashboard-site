"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Loader2 } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { StoreWorkingHoursEditor } from "@/components/dashboard/store/StoreWorkingHoursEditor";
import { Button } from "@/components/ui/button";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { useBranches } from "@/hooks/use-branches";
import { useOnlineOrderAccess } from "@/hooks/use-online-order-access";
import { STORE_QUERY_KEYS } from "@/hooks/use-store";
import { ApiError } from "@/lib/api";
import { anyBranchHasCourier } from "@/lib/branch";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_BACK, DASHBOARD_PANEL } from "@/lib/dashboard-surface";
import {
  getStoreSetupPrefill,
  setupStore,
  type StoreBusinessInfo,
  type StoreDeliverySettings,
  type StoreDeliveryType,
  type StorePaymentMethod,
} from "@/lib/store-api";
import {
  defaultWorkingHours,
  STORE_DELIVERY_TYPE_LABEL,
  STORE_PAYMENT_METHOD_LABEL,
  storeDeliveryTypesForCourier,
} from "@/lib/store-ui";
import { cn } from "@/lib/utils";

type WizardStep = "business" | "delivery" | "menu" | "summary";

const STEPS: { id: WizardStep; label: string }[] = [
  { id: "business", label: "İşletme bilgileri" },
  { id: "delivery", label: "Teslimat ayarları" },
  { id: "menu", label: "Menü" },
  { id: "summary", label: "Özet" },
];

const EMPTY_BUSINESS: StoreBusinessInfo = {
  businessName: "",
  legalName: "",
  taxOffice: "",
  taxNumber: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  district: "",
};

const DEFAULT_DELIVERY: StoreDeliverySettings = {
  minOrderAmount: 150,
  deliveryFee: 25,
  freeDeliveryThreshold: null,
  avgPrepMinutes: 30,
  deliveryRadiusKm: null,
  deliveryTypes: ["DELIVERY"],
  paymentMethods: ["CASH_ON_DELIVERY", "CARD_ON_DELIVERY"],
  workingHours: defaultWorkingHours(),
};

export default function OnlineOrderSetupView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const { accessLoading, canUseOnlineOrder } = useOnlineOrderAccess();
  const branchesQuery = useBranches();
  const courierEnabled = branchesQuery.isSuccess && anyBranchHasCourier(branchesQuery.data);

  const prefillQuery = useQuery({
    queryKey: ["store", "setup-prefill"],
    queryFn: getStoreSetupPrefill,
    enabled: canUseOnlineOrder && !accessLoading,
  });

  const [step, setStep] = useState<WizardStep>("business");
  const [business, setBusiness] = useState<StoreBusinessInfo>(EMPTY_BUSINESS);
  const [delivery, setDelivery] = useState<StoreDeliverySettings>(DEFAULT_DELIVERY);
  const [copyMenu, setCopyMenu] = useState(true);
  const [sourceMenuId, setSourceMenuId] = useState<number | null>(null);

  const prefill = prefillQuery.data;
  const [prefillApplied, setPrefillApplied] = useState(false);

  if (prefill && !prefillApplied) {
    setPrefillApplied(true);
    if (prefill.menus.length > 0) {
      setSourceMenuId(prefill.menus[0].menuId);
    }
  }

  const selectedMenu = useMemo(
    () => prefill?.menus.find((menu) => menu.menuId === sourceMenuId) ?? null,
    [prefill?.menus, sourceMenuId],
  );

  const setupMutation = useMutation({
    mutationFn: () =>
      setupStore({
        business,
        delivery: {
          ...delivery,
          deliveryTypes: storeDeliveryTypesForCourier(delivery.deliveryTypes, courierEnabled),
        },
        sourceMenuId: copyMenu ? sourceMenuId : null,
      }),
    onSuccess: async (merchant) => {
      queryClient.setQueryData(STORE_QUERY_KEYS.merchant, merchant);
      await queryClient.invalidateQueries({ queryKey: STORE_QUERY_KEYS.merchant });
      notify("info", "Mağazanız kuruldu.");
      router.push(DASHBOARD_ROUTES.onlineOrder);
    },
    onError: (error) => {
      notify("danger", error instanceof ApiError ? error.message : "Mağaza kurulamadı.");
    },
  });

  if (accessLoading || prefillQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Yükleniyor…
      </div>
    );
  }

  if (prefillQuery.isError) {
    const message =
      prefillQuery.error instanceof ApiError ? prefillQuery.error.message : null;
    return (
      <p className="text-sm text-muted-foreground">
        {message || "Kurulum bilgileri yüklenemedi. Sayfayı yenileyip tekrar deneyin."}
      </p>
    );
  }

  if (!canUseOnlineOrder) {
    return <p className="text-sm text-muted-foreground">Bu özellik Online Sipariş paketi gerektirir.</p>;
  }

  if (prefill?.alreadySetUp) {
    return (
      <div className={`${DASHBOARD_PANEL} space-y-3`}>
        <p className="text-sm font-medium text-foreground">Mağazanız zaten kurulu</p>
        <Button asChild>
          <Link href={DASHBOARD_ROUTES.onlineOrder}>Mağaza paneline git</Link>
        </Button>
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((entry) => entry.id === step);
  const businessValid = business.businessName.trim().length > 0;
  const deliveryValid = delivery.deliveryTypes.length > 0 && delivery.paymentMethods.length > 0;
  const menuValid = !copyMenu || sourceMenuId != null;

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardPageHeader
        title="Online Sipariş kurulumu"
        hint="Gizli adresli paket servis mağazanızı dört adımda açın."
        back={
          <Link href={DASHBOARD_ROUTES.onlineOrder} aria-label="Geri" className={DASHBOARD_BACK}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
      />

      <ol className="flex flex-wrap gap-2">
        {STEPS.map((entry, index) => (
          <li
            key={entry.id}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
              index === stepIndex
                ? "border-foreground bg-foreground text-background"
                : index < stepIndex
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-border text-muted-foreground",
            )}
          >
            {index < stepIndex ? <Check className="h-3.5 w-3.5" /> : <span>{index + 1}</span>}
            {entry.label}
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className={`${DASHBOARD_PANEL} space-y-5`}
        >
          {step === "business" ? (
            <BusinessStep business={business} onBusinessChange={setBusiness} />
          ) : null}

          {step === "delivery" ? (
            <DeliveryStep delivery={delivery} courierEnabled={courierEnabled} onChange={setDelivery} />
          ) : null}

          {step === "menu" ? (
            <MenuStep
              menus={prefill?.menus ?? []}
              copyMenu={copyMenu}
              onCopyMenuChange={setCopyMenu}
              sourceMenuId={sourceMenuId}
              onSourceMenuChange={setSourceMenuId}
            />
          ) : null}

          {step === "summary" ? (
            <SummaryStep
              business={business}
              delivery={delivery}
              copyMenu={copyMenu}
              productCount={selectedMenu?.productCount ?? 0}
              menuName={selectedMenu?.businessName ?? null}
            />
          ) : null}

          <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
            <Button
              variant="outline"
              disabled={stepIndex === 0 || setupMutation.isPending}
              onClick={() => setStep(STEPS[Math.max(stepIndex - 1, 0)].id)}
            >
              Geri
            </Button>
            {step === "summary" ? (
              <Button disabled={setupMutation.isPending} onClick={() => setupMutation.mutate()}>
                {setupMutation.isPending ? "Kuruluyor…" : "Kurulumu bitir"}
              </Button>
            ) : (
              <Button
                disabled={
                  (step === "business" && !businessValid) ||
                  (step === "delivery" && !deliveryValid) ||
                  (step === "menu" && !menuValid)
                }
                onClick={() => setStep(STEPS[Math.min(stepIndex + 1, STEPS.length - 1)].id)}
              >
                İlerle
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function BusinessStep({
  business,
  onBusinessChange,
}: {
  business: StoreBusinessInfo;
  onBusinessChange: (value: StoreBusinessInfo) => void;
}) {
  const update = (patch: Partial<StoreBusinessInfo>) => onBusinessChange({ ...business, ...patch });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">İşletme bilgileri</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Mağaza için işletme bilgilerini girin.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="İşletme adı" required>
          <input
            className={INPUT_CLASS}
            value={business.businessName}
            onChange={(event) => update({ businessName: event.target.value })}
            placeholder="Kebapçı Mehmet"
          />
        </Field>
        <Field label="Telefon">
          <input
            className={INPUT_CLASS}
            value={business.phone ?? ""}
            onChange={(event) => update({ phone: event.target.value })}
            placeholder="0555 000 00 00"
          />
        </Field>
        <Field label="E-posta">
          <input
            className={INPUT_CLASS}
            value={business.email ?? ""}
            onChange={(event) => update({ email: event.target.value })}
          />
        </Field>
        <Field label="Ünvan">
          <input
            className={INPUT_CLASS}
            value={business.legalName ?? ""}
            onChange={(event) => update({ legalName: event.target.value })}
          />
        </Field>
        <Field label="Vergi dairesi">
          <input
            className={INPUT_CLASS}
            value={business.taxOffice ?? ""}
            onChange={(event) => update({ taxOffice: event.target.value })}
          />
        </Field>
        <Field label="Vergi no">
          <input
            className={INPUT_CLASS}
            value={business.taxNumber ?? ""}
            onChange={(event) => update({ taxNumber: event.target.value })}
          />
        </Field>
        <Field label="İl">
          <input
            className={INPUT_CLASS}
            value={business.city ?? ""}
            onChange={(event) => update({ city: event.target.value })}
          />
        </Field>
        <Field label="İlçe">
          <input
            className={INPUT_CLASS}
            value={business.district ?? ""}
            onChange={(event) => update({ district: event.target.value })}
          />
        </Field>
        <Field label="Adres" className="sm:col-span-2">
          <textarea
            className={`${INPUT_CLASS} min-h-[80px] py-2`}
            value={business.address ?? ""}
            onChange={(event) => update({ address: event.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

function DeliveryStep({
  delivery,
  courierEnabled,
  onChange,
}: {
  delivery: StoreDeliverySettings;
  courierEnabled: boolean;
  onChange: (value: StoreDeliverySettings) => void;
}) {
  const update = (patch: Partial<StoreDeliverySettings>) => onChange({ ...delivery, ...patch });

  const toggleDeliveryType = (type: StoreDeliveryType) => {
    if (type === "DELIVERY" && !courierEnabled) return;
    const next = delivery.deliveryTypes.includes(type)
      ? delivery.deliveryTypes.filter((entry) => entry !== type)
      : [...delivery.deliveryTypes, type];
    update({ deliveryTypes: next });
  };

  const togglePaymentMethod = (method: StorePaymentMethod) => {
    const next = delivery.paymentMethods.includes(method)
      ? delivery.paymentMethods.filter((entry) => entry !== method)
      : [...delivery.paymentMethods, method];
    update({ paymentMethods: next });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Teslimat ayarları</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Bu değerler mağaza sayfanızda müşteriye gösterilir ve sipariş sırasında sunucuda doğrulanır.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Minimum sepet tutarı (₺)">
          <input
            type="number"
            min={0}
            className={INPUT_CLASS}
            value={delivery.minOrderAmount}
            onChange={(event) => update({ minOrderAmount: Number(event.target.value) })}
          />
        </Field>
        <Field label="Teslimat ücreti (₺)">
          <input
            type="number"
            min={0}
            className={INPUT_CLASS}
            value={delivery.deliveryFee}
            onChange={(event) => update({ deliveryFee: Number(event.target.value) })}
          />
        </Field>
        <Field label="Ücretsiz teslimat eşiği (₺)" hint="Boş bırakırsanız her siparişte ücret alınır.">
          <input
            type="number"
            min={0}
            className={INPUT_CLASS}
            value={delivery.freeDeliveryThreshold ?? ""}
            onChange={(event) =>
              update({ freeDeliveryThreshold: event.target.value ? Number(event.target.value) : null })
            }
          />
        </Field>
        <Field label="Ortalama hazırlık süresi (dk)">
          <input
            type="number"
            min={0}
            className={INPUT_CLASS}
            value={delivery.avgPrepMinutes}
            onChange={(event) => update({ avgPrepMinutes: Number(event.target.value) })}
          />
        </Field>
      </div>

      <Field label="Teslimat türleri">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STORE_DELIVERY_TYPE_LABEL) as StoreDeliveryType[]).map((type) => (
            <TogglePill
              key={type}
              selected={delivery.deliveryTypes.includes(type) && (type !== "DELIVERY" || courierEnabled)}
              label={STORE_DELIVERY_TYPE_LABEL[type]}
              onToggle={() => toggleDeliveryType(type)}
            />
          ))}
        </div>
      </Field>

      <Field label="Ödeme yöntemleri">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STORE_PAYMENT_METHOD_LABEL) as StorePaymentMethod[]).map((method) => (
            <TogglePill
              key={method}
              selected={delivery.paymentMethods.includes(method)}
              label={STORE_PAYMENT_METHOD_LABEL[method]}
              onToggle={() => togglePaymentMethod(method)}
            />
          ))}
        </div>
      </Field>

      <Field label="Çalışma saatleri">
        <StoreWorkingHoursEditor
          value={delivery.workingHours}
          onChange={(workingHours) => update({ workingHours })}
        />
      </Field>
    </div>
  );
}

function MenuStep({
  menus,
  copyMenu,
  onCopyMenuChange,
  sourceMenuId,
  onSourceMenuChange,
}: {
  menus: { menuId: number; businessName: string; productCount: number; branchName?: string | null }[];
  copyMenu: boolean;
  onCopyMenuChange: (value: boolean) => void;
  sourceMenuId: number | null;
  onSourceMenuChange: (value: number | null) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Menü</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Mağaza kataloğu QR menünüzden bağımsızdır; istediğinizde farklı fiyat ve ürün tanımlayabilirsiniz.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <ChoiceCard
          selected={copyMenu}
          title="Mevcut menümden ürünleri aktar"
          description="Kategoriler, ürünler ve seçenekler mağaza kataloğuna kopyalanır."
          onSelect={() => onCopyMenuChange(true)}
          disabled={menus.length === 0}
        />
        <ChoiceCard
          selected={!copyMenu}
          title="Ürünleri sonra kendim ekleyeceğim"
          description="Mağaza boş katalogla kurulur."
          onSelect={() => onCopyMenuChange(false)}
        />
      </div>

      {copyMenu ? (
        menus.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aktarılabilecek aktif menü bulunamadı. &quot;Ürünleri sonra kendim ekleyeceğim&quot; seçeneğiyle devam edin.
          </p>
        ) : (
          <Field label="Kaynak menü">
            <select
              className={SELECT_CLASS}
              value={sourceMenuId ?? ""}
              onChange={(event) => onSourceMenuChange(event.target.value ? Number(event.target.value) : null)}
            >
              {menus.map((menu) => (
                <option key={menu.menuId} value={menu.menuId}>
                  {menu.branchName
                    ? `${menu.branchName} · ${menu.businessName} — ${menu.productCount} ürün`
                    : `${menu.businessName} — ${menu.productCount} ürün`}
                </option>
              ))}
            </select>
          </Field>
        )
      ) : null}
    </div>
  );
}

function SummaryStep({
  business,
  delivery,
  copyMenu,
  productCount,
  menuName,
}: {
  business: StoreBusinessInfo;
  delivery: StoreDeliverySettings;
  copyMenu: boolean;
  productCount: number;
  menuName: string | null;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Özet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kurulumu bitirdiğinizde gizli mağaza adresiniz oluşturulur.
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <SummaryRow label="İşletme" value={business.businessName} />
        <SummaryRow label="Telefon" value={business.phone || "-"} />
        <SummaryRow label="Adres" value={business.address || "-"} className="sm:col-span-2" />
        <SummaryRow label="Minimum sepet" value={`${delivery.minOrderAmount} ₺`} />
        <SummaryRow label="Teslimat ücreti" value={`${delivery.deliveryFee} ₺`} />
        <SummaryRow label="Hazırlık süresi" value={`${delivery.avgPrepMinutes} dk`} />
        <SummaryRow
          label="Teslimat"
          value={delivery.deliveryTypes.map((type) => STORE_DELIVERY_TYPE_LABEL[type]).join(", ")}
        />
        <SummaryRow
          label="Ödeme"
          value={delivery.paymentMethods.map((method) => STORE_PAYMENT_METHOD_LABEL[method]).join(", ")}
          className="sm:col-span-2"
        />
        <SummaryRow
          label="Katalog"
          value={
            copyMenu && menuName
              ? `${menuName} menüsünden ${productCount} ürün aktarılacak`
              : "Ürünler sonra eklenecek"
          }
          className="sm:col-span-2"
        />
      </dl>
    </div>
  );
}

const INPUT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring";

const SELECT_CLASS = INPUT_CLASS;

function Field({
  label,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-2", className)}>
      <span className="text-xs leading-4 text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function ChoiceCard({
  selected,
  title,
  description,
  onSelect,
  disabled,
}: {
  selected: boolean;
  title: string;
  description: string;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        selected
          ? "bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04] dark:bg-background dark:shadow-none dark:ring-white/10"
          : "bg-transparent ring-1 ring-black/[0.06] hover:bg-white/70 dark:ring-white/10 dark:hover:bg-muted/30",
        disabled ? "cursor-not-allowed opacity-50" : "",
      )}
    >
      <span className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </span>
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors",
          selected ? "bg-foreground/10 text-foreground" : "bg-transparent text-transparent",
        )}
      >
        <Check className="h-3 w-3" strokeWidth={2.5} />
      </span>
    </button>
  );
}

function TogglePill({
  selected,
  label,
  onToggle,
}: {
  selected: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs transition-colors",
        selected ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
}

function SummaryRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border px-3 py-2", className)}>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
