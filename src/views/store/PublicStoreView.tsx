import type { StorefrontData } from "@/lib/store-public";

export function PublicStoreView({ data }: { data: StorefrontData }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md space-y-3 text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Mağaza</p>
        <h1 className="text-2xl font-semibold">{data.store.businessName}</h1>
        <p className="text-lg font-medium">Çok yakında sizlerle.</p>
      </div>
    </main>
  );
}
