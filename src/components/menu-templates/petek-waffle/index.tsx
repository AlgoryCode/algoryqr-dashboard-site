"use client";

import { useEffect, useMemo, useState } from "react";

import type { MainCategoryApiItem, MenuProductApiItem } from "@/lib/api";
import {
  MenuCategoryScrollSentinel,
  MenuProductScrollSentinel,
  useMenuPriceDisplayOptional,
  useOrderingOptional,
  usePublicMenuTheme,
} from "../shared";
import type { MenuTemplateProps } from "../types";

import { waffleArtKind, WaffleArt } from "./art";
import { PetekChefAskButton } from "./PetekChefAskButton";

type SectionGroup = { title: string | null; products: MenuProductApiItem[] };

type MenuSection = {
  id: string;
  title: string;
  tone: number;
  groups: SectionGroup[];
};

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

function titleLines(name: string): string[] {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return [name.trim() || "Waffle"];
  return [parts[0], parts.slice(1).join(" ")];
}

function PriceLabel({ product }: { product: MenuProductApiItem }) {
  const label = useMenuPriceDisplayOptional(product.price, product.currency);
  if (!label) return null;
  return <span className="pw-price">{label}</span>;
}

export function PetekWaffleMenuTemplate({ menu, products, categories = [] }: MenuTemplateProps) {
  const theme = usePublicMenuTheme();
  const ordering = useOrderingOptional();
  const sections = useMemo(() => buildSections(categories, products), [categories, products]);
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const [openProduct, setOpenProduct] = useState<MenuProductApiItem | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const lines = titleLines(menu.businessName);
  const slogan = menu.slogan?.trim() || "Siparişte hamurdan pişirilir, sıcak gelir.";

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
      setActiveId(sections[index]?.id ?? sections[0].id);
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
      <header>
        <div className="pw-wrap">
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
        </div>
      </header>
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
      <footer className="pw-wrap">Fiyatlar ₺ cinsindendir. Alerjen bilgisi için ürün detayına bakın ya da bize sorun.</footer>
      <div className={ordering && ordering.cartCount > 0 ? "pw-bar on" : "pw-bar"}>
        <button type="button" onClick={() => ordering?.setCartOpen(true)}>
          <span>Sepeti gör ({ordering?.cartCount ?? 0})</span>
          <CartTotal />
        </button>
      </div>
      <PetekChefAskButton
        publicId={menu.publicId ?? ""}
        chefName={menu.chefName}
        chefDisplayName={menu.chefDisplayName}
        chefAvatarUrl={menu.chefAvatarUrl}
      />
      <button type="button" className={openProduct ? "pw-ov on" : "pw-ov"} aria-label="Kapat" onClick={() => setOpenProduct(null)} />
      <div className={openProduct ? "pw-sheet on" : "pw-sheet"} role="dialog" aria-modal="true">
        {openProduct ? (
          <ProductSheet
            product={openProduct}
            onClose={() => setOpenProduct(null)}
            onAdd={() => {
              void addProduct(openProduct);
              setOpenProduct(null);
            }}
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
}: {
  product: MenuProductApiItem;
  onClose: () => void;
  onAdd: () => void;
}) {
  const kind = waffleArtKind(product.name, product.mainCategoryName ?? "");
  const allergens = (product.allergens ?? []).map((item) => item.name).filter(Boolean);
  return (
    <>
      <button type="button" className="pw-x" aria-label="Kapat" onClick={onClose}>
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
      <p className="pw-meta">Alerjen: {allergens.length > 0 ? allergens.join(", ") : "Belirtilmemiş"}</p>
      <button type="button" className="pw-cta" disabled={product.available === false} onClick={onAdd}>
        Sepete ekle
      </button>
    </>
  );
}
