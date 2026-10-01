"use client";

import { useEffect, useMemo, useState } from "react";
import type { MainCategoryApiItem, MenuProductApiItem } from "@/lib/api";
import {
  MenuCategoryScrollSentinel,
  MenuProductScrollSentinel,
  useMenuPriceDisplayOptional,
  useOrderingOptional,
  usePublicMenuTheme,
  useMenuLocaleOptional,
} from "../shared";
import type { MenuTemplateProps } from "../types";

import { waffleArtKind, WaffleArt } from "./art";
import { PetekChefAskButton, PetekChefPromptBar } from "./PetekChefAskButton";

type SectionGroup = { title: string | null; products: MenuProductApiItem[] };

type MenuSection = {
  id: string;
  title: string;
  tone: number;
  groups: SectionGroup[];
};

function categoryNote(title: string, english: boolean): string | null {
  const key = title.trim().toLocaleLowerCase("tr-TR");
  const notes: Record<string, string> = english
    ? { waffles: "Two slices per plate.", "on a stick": "Small portions to eat on the go.", extras: "Added to any waffle." }
    : { waffle: "Her tabakta iki dilim.", "çubukta": "Elde yemek için, küçük porsiyon.", ekstralar: "Herhangi bir waffle'a eklenir." };
  return notes[key] ?? null;
}

function ProductBadge({ product }: { product: MenuProductApiItem }) {
  const tag = product.tags?.map((item) => item.name.trim()).find(Boolean);
  const label = product.chefRecommended ? "Şefin seçimi" : tag;
  return label ? <span className="pw-badge pw-product-badge">{label}</span> : null;
}

function buildSections(categories: MainCategoryApiItem[], products: MenuProductApiItem[]): MenuSection[] {
  const mains = [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const sections: MenuSection[] = [];

  const push = (id: string, title: string, items: MenuProductApiItem[]) => {
    if (items.length === 0) return;
    const buckets = new Map<string, MenuProductApiItem[]>();
    for (const product of items) {
      const sub = product.subCategoryName?.trim() || "";
      const key = sub && sub !== title ? sub : "";
      const list = buckets.get(key) ?? [];
      list.push(product);
      buckets.set(key, list);
    }
    sections.push({
      id,
      title,
      tone: sections.length % 4,
      groups: [...buckets.entries()].map(([key, group]) => ({
        title: key || null,
        products: group,
      })),
    });
  };

  if (mains.length > 0) {
    for (const main of mains) {
      push(
        `pw-${main.id}`,
        main.name,
        products.filter((product) => product.mainCategoryId === main.id),
      );
    }
    return sections;
  }

  const names = new Map<string, MenuProductApiItem[]>();
  for (const product of products) {
    const title = product.mainCategoryName?.trim() || product.subCategoryName?.trim() || "Menü";
    const list = names.get(title) ?? [];
    list.push(product);
    names.set(title, list);
  }
  for (const [title, items] of names) push(`pw-${title}`, title, items);
  return sections;
}

function PriceLabel({ product }: { product: MenuProductApiItem }) {
  const label = useMenuPriceDisplayOptional(product.price, product.currency);
  if (!label) return null;
  return <span className="pw-price">{label}</span>;
}

export function PetekWaffleMenuTemplate({ menu, products, categories = [] }: MenuTemplateProps) {
  const theme = usePublicMenuTheme();
  const ordering = useOrderingOptional();
  const locale = useMenuLocaleOptional();
  const sections = useMemo(() => buildSections(categories, products), [categories, products]);
  const favoriteProducts = useMemo(() => {
    const names = ["Çikolatalı", "Dondurmalı", "Meyveli", "Antep fıstıklı", "Çikolata kaplamalı", "Milkshake"];
    return names
      .map((name) => products.find((product) => product.name.trim() === name))
      .filter((product): product is MenuProductApiItem => Boolean(product))
      .slice(0, 6);
  }, [products]);
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const [openProduct, setOpenProduct] = useState<MenuProductApiItem | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const normalizedBusinessName = menu.businessName.trim().toLocaleLowerCase("tr-TR").replace(/[^a-z0-9]/g, "");
  const isVenscoffee = normalizedBusinessName === "venscoffee" || normalizedBusinessName.startsWith("venscoffee");
  const lines = isVenscoffee ? ["Venscoffee"] : ["Petek", "Waffle"];
  const slogan = locale?.locale === "en"
    ? "Baked to order from fresh batter, served hot."
    : menu.slogan?.trim() || "Siparişte hamurdan pişirilir, sıcak gelir.";
  const english = locale?.locale === "en";
  const copy = english
    ? { favorites: "Most loved", footer: "Prices are in Turkish lira (₺). Check the item details for allergens or just ask us.", cart: "View cart", close: "Close", allergens: "Allergens", unspecified: "Not specified", add: "Add to cart" }
    : { favorites: "En çok sevilenler", footer: "Fiyatlar ₺ cinsindendir. Alerjen bilgisi için ürün detayına bakın ya da bize sorun.", cart: "Sepeti gör", close: "Kapat", allergens: "Alerjen", unspecified: "Belirtilmemiş", add: "Sepete ekle" };

  useEffect(() => {
    if (!openProduct) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenProduct(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openProduct]);

  useEffect(() => {
    const nodes = sections
      .map((section) => document.getElementById(section.id))
      .filter((node): node is HTMLElement => node != null);
    if (nodes.length === 0) return;
    const onScroll = () => {
      const mark = window.scrollY + 130;
      let index = 0;
      nodes.forEach((node, position) => {
        if (node.offsetTop <= mark) index = position;
      });
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
        index = nodes.length - 1;
      }
      setActiveId(sections[index]?.id ?? sections[0]?.id ?? "");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  const addProduct = async (product: MenuProductApiItem) => {
    if (!ordering || product.available === false) {
      setOpenProduct(product);
      return;
    }
    setBusyId(product.productId);
    try {
      await ordering.beginAddProduct(product, 1, { openCart: false });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={theme.rootClassName}>
      <style>{theme.styles}</style>
      <div className="pw-mq" aria-label="Duyurular">
        <div className="pw-mqi">
          {(english
            ? ["Waffle + coffee 280 ₺ until noon", "Second waffle on a stick 20% off", "Baked fresh to order"]
            : ["Öğleye kadar waffle + kahve 280 ₺", "Çubukta waffle'da ikinci %20 indirimli", "Sıcak sıcak, siparişte pişer"]
          ).map((item) => (
            <span key={item}>{item}</span>
          ))}
          {(english
            ? ["Waffle + coffee 280 ₺ until noon", "Second waffle on a stick 20% off", "Baked fresh to order"]
            : ["Öğleye kadar waffle + kahve 280 ₺", "Çubukta waffle'da ikinci %20 indirimli", "Sıcak sıcak, siparişte pişer"]
          ).map((item) => (
            <span key={`${item}-copy`} aria-hidden>{item}</span>
          ))}
        </div>
      </div>
      <header>
        <div className="pw-wrap">
          <div className="pw-lang" role="group" aria-label="Dil">
            <button type="button" aria-pressed={locale?.locale === "tr"} onClick={() => locale?.setLocale("tr")}>TR</button>
            <button type="button" aria-pressed={locale?.locale === "en"} onClick={() => locale?.setLocale("en")}>EN</button>
          </div>
          <span className="pw-sp" style={{ ["--r" as string]: "30deg", background: "#ffb3c6", right: "22%", top: 34 }} />
          <span className="pw-sp" style={{ ["--r" as string]: "-40deg", background: "#9fdcc3", right: "8%", top: 62 }} />
          <span className="pw-sp" style={{ ["--r" as string]: "70deg", background: "#ffd36b", right: "34%", top: 18 }} />
          <h1>
            {lines[0]}
            {lines[1] ? (
              <>
                <br />
                {lines[1]}
              </>
            ) : null}
          </h1>
          <p>{slogan}</p>
          {ordering?.tableName ? <p>Masa: {ordering.tableName}</p> : null}
          <PetekChefPromptBar />
        </div>
      </header>
      {favoriteProducts.length > 0 ? (
        <section className="pw-fav" aria-label="En çok sevilenler">
          <div className="pw-wrap"><h2>{copy.favorites}</h2></div>
          <div className="pw-fs">
            {favoriteProducts.map((product, index) => {
              const kind = waffleArtKind(product.name, product.mainCategoryName ?? "");
              return (
                <article key={product.productId} className={`pw-fc pw-fc-${index % 4}`}>
                  <button type="button" className="pw-fa" onClick={() => setOpenProduct(product)}>
                    <WaffleArt kind={kind} />
                    {index < 2 ? <span className="pw-badge">{english ? "Best seller" : "Çok sevilen"}</span> : <ProductBadge product={product} />}
                  </button>
                  <button type="button" className="pw-fn" onClick={() => setOpenProduct(product)}>{product.name}</button>
                  <div className="pw-fp">
                    <PriceLabel product={product} />
                    <button type="button" className="pw-add" onClick={() => void addProduct(product)} aria-label={`Sepete ekle: ${product.name}`}>+</button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
      <nav>
        <div className="pw-wrap">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={section.id === activeId ? "on" : undefined}
              onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              {section.title}
            </button>
          ))}
        </div>
      </nav>
      <main className="pw-wrap">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className={`pw-cat pw-c${section.tone}`}>
            <h2>{section.title}</h2>
            {categoryNote(section.title, english) ? <p className="pw-note">{categoryNote(section.title, english)}</p> : null}
            {section.groups.map((group) => (
              <div key={group.title ?? section.id}>
                {group.title ? <p className="pw-sub">{group.title}</p> : null}
                {group.products.map((product) => {
                  const kind = waffleArtKind(product.name, `${section.title} ${product.subCategoryName ?? ""}`);
                  return (
                    <div key={product.productId} className="pw-item">
                      <button type="button" className="pw-item-open" onClick={() => setOpenProduct(product)}>
                        <span className="pw-th">
                          <WaffleArt kind={kind} />
                        </span>
                        <span className="pw-tx">
                          <span className="pw-name">{product.name}</span>
                          <ProductBadge product={product} />
                          {product.description ? <p className="pw-desc">{product.description}</p> : null}
                        </span>
                      </button>
                      <span className="pw-rt">
                        <PriceLabel product={product} />
                        <button
                          type="button"
                          className="pw-add"
                          disabled={busyId === product.productId || product.available === false}
                          aria-label={`Sepete ekle: ${product.name}`}
                          onClick={() => void addProduct(product)}
                        >
                          +
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </section>
        ))}
        <MenuProductScrollSentinel />
        <MenuCategoryScrollSentinel />
      </main>
      <footer className="pw-wrap">{copy.footer}</footer>
      <div className={ordering && ordering.cartCount > 0 ? "pw-bar on" : "pw-bar"}>
        <button type="button" onClick={() => ordering?.setCartOpen(true)}>
          <span>{copy.cart} ({ordering?.cartCount ?? 0})</span>
          <CartTotal />
        </button>
      </div>
      <PetekChefAskButton
        publicId={menu.publicId ?? ""}
        chefName={menu.chefName}
        chefDisplayName={menu.chefDisplayName}
        chefAvatarUrl={menu.chefAvatarUrl}
      />
      <button type="button" className={openProduct ? "pw-ov on" : "pw-ov"} aria-label={copy.close} onClick={() => setOpenProduct(null)} />
      <div className={openProduct ? "pw-sheet on" : "pw-sheet"} role="dialog" aria-modal="true">
        {openProduct ? (
          <ProductSheet
            product={openProduct}
            onClose={() => setOpenProduct(null)}
            onAdd={() => {
              void addProduct(openProduct);
              setOpenProduct(null);
            }}
            copy={copy}
          />
        ) : null}
      </div>
    </div>
  );
}

function CartTotal() {
  const ordering = useOrderingOptional();
  const label = useMenuPriceDisplayOptional(ordering?.cartTotal ?? 0, ordering?.localItems[0]?.currency ?? "TRY");
  return <span>{label}</span>;
}

function ProductSheet({
  product,
  onClose,
  onAdd,
  copy,
}: {
  product: MenuProductApiItem;
  onClose: () => void;
  onAdd: () => void;
  copy: { close: string; allergens: string; unspecified: string; add: string };
}) {
  const kind = waffleArtKind(product.name, product.mainCategoryName ?? "");
  const allergens = (product.allergens ?? []).map((item) => item.name).filter(Boolean);
  return (
    <>
      <button type="button" className="pw-x" aria-label={copy.close} onClick={onClose}>
        ×
      </button>
      <div className="pw-big">
        <WaffleArt kind={kind} />
      </div>
      <h3>{product.name}</h3>
      <p className="pw-pr">
        <PriceLabel product={product} />
      </p>
      {product.description ? <p>{product.description}</p> : null}
      <p className="pw-meta">{copy.allergens}: {allergens.length > 0 ? allergens.join(", ") : copy.unspecified}</p>
      <button type="button" className="pw-cta" disabled={product.available === false} onClick={onAdd}>
        {copy.add} · <PriceLabel product={product} />
      </button>
    </>
  );
}
