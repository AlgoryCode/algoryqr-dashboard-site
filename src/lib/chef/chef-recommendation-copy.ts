import type { ChefProductItem } from "@/lib/chef/chef-product-item";

function highlightNames(products: ChefProductItem[]): string {
  const names = products.slice(0, 3).map((product) => product.name);
  if (names.length === 0) return "bu seçenekler";
  if (names.length === 1) return `**${names[0]}**`;
  if (names.length === 2) return `**${names[0]}** ve **${names[1]}**`;
  return `**${names[0]}**, **${names[1]}** ve **${names[2]}**`;
}

/**
 * Persuasive assistant copy shown above product cards (plain text, no markdown rendering).
 */
export function buildChefPersuasionText(products: ChefProductItem[]): string {
  if (products.length === 0) {
    return "Menüde aradığınız profile uygun birkaç seçenek derledim; damak dengesi ve sunum kalitesi ön planda.";
  }

  const featured = highlightNames(products).replace(/\*\*/g, "");
  const chefPick = products.some((product) => product.chefRecommended);
  const reason = chefPick
    ? "Şef mutfağımızın özel işaretlediği lezzetler arasında yer alıyor; misafirlerimizden gelen geri bildirimler de oldukça güçlü."
    : "Menümüzdeki dengeli tat profili ve güncel sunumuyla öne çıkıyor; özellikle bu saatte keyifle tüketilebilecek bir seçim.";

  return `${featured} için size özel bir köşe hazırladım. ${reason} İsterseniz hemen sepete ekleyebilir veya detaydan içeriğe yakından bakabilirsiniz.`;
}

export function mergeReplyWithPersuasion(reply: string, products: ChefProductItem[]): string {
  const persuasion = buildChefPersuasionText(products);
  const trimmed = reply.trim();
  if (!trimmed) return persuasion;
  if (trimmed.length > 280) return trimmed;
  return `${trimmed}\n\n${persuasion}`;
}
