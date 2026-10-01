const W =
  '<rect x="5" y="9" width="54" height="46" rx="11" fill="#efc47e"/><path d="M5 24h54M5 40h54M22 9v46M42 9v46" stroke="#cf9a4a" stroke-width="2.5"/>';

const ART: Record<string, string> = {
  plain:
    W +
    '<rect x="23" y="22" width="18" height="13" rx="3" fill="#fff4b8"/><circle cx="14" cy="46" r="2" fill="#fff"/><circle cx="48" cy="18" r="2" fill="#fff"/><circle cx="46" cy="47" r="2" fill="#fff"/>',
  choco:
    W +
    '<path d="M9 22q8-8 14 0t14 0 14 0-6 16q-8 6-16 0t-14 0z" fill="#5b3425"/><circle cx="24" cy="40" r="5.5" fill="#ffe08a"/><circle cx="39" cy="42" r="5.5" fill="#ffe08a"/>',
  fruit:
    W +
    '<circle cx="22" cy="28" r="7" fill="#e8466b"/><circle cx="40" cy="33" r="7" fill="#e8466b"/><circle cx="29" cy="45" r="5" fill="#4b5bb0"/><circle cx="46" cy="18" r="3.5" fill="#7bc47f"/>',
  pist:
    W +
    '<ellipse cx="32" cy="32" rx="17" ry="12" fill="#fffaf0"/><circle cx="26" cy="29" r="3" fill="#8cc15a"/><circle cx="35" cy="26" r="3" fill="#8cc15a"/><circle cx="38" cy="35" r="3" fill="#8cc15a"/><circle cx="27" cy="38" r="3" fill="#8cc15a"/>',
  ice:
    W +
    '<circle cx="32" cy="28" r="12" fill="#fffaf0"/><path d="M22 32q4 12 8 2t6 6 6-8" fill="none" stroke="#c87a2c" stroke-width="4" stroke-linecap="round"/>',
  savory:
    W +
    '<path d="M9 24q8 8 14 0t14 0 14 0v10q-7 6-14 0t-14 0-14 0z" fill="#ffd84a"/><circle cx="22" cy="42" r="4.5" fill="#e0483a"/><circle cx="40" cy="44" r="4.5" fill="#e0483a"/>',
  coffee:
    '<path d="M12 20h32v20a12 12 0 0 1-12 12h-8a12 12 0 0 1-12-12z" fill="#fff"/><path d="M44 25h4a7 7 0 0 1 0 14h-4" fill="none" stroke="#fff" stroke-width="4"/><rect x="16" y="23" width="24" height="7" rx="3" fill="#6b3d2a"/>',
  tea: '<path d="M12 20h32v20a12 12 0 0 1-12 12h-8a12 12 0 0 1-12-12z" fill="#fff"/><path d="M44 25h4a7 7 0 0 1 0 14h-4" fill="none" stroke="#fff" stroke-width="4"/><rect x="16" y="23" width="24" height="7" rx="3" fill="#c0502a"/>',
  lemon:
    '<path d="M16 12h32l-4 44H20z" fill="#fff" opacity=".85"/><path d="M18 26h28l-2 30H20z" fill="#ffe76a"/><circle cx="32" cy="20" r="8" fill="#ffe76a" stroke="#d9bb2f" stroke-width="2"/>',
  shake:
    '<path d="M16 18h32l-4 38H20z" fill="#ffb3c6"/><path d="M16 18h32l-.6 6H16.6z" fill="#fffaf0"/><path d="M38 18l6-12" stroke="#d93f6b" stroke-width="4" stroke-linecap="round"/>',
};

export function waffleArtKind(name: string, category: string): string {
  const text = `${name} ${category}`.toLocaleLowerCase("tr");
  if (/kahve|latte|espresso/.test(text)) return "coffee";
  if (/çay|tea/.test(text)) return "tea";
  if (/limon/.test(text)) return "lemon";
  if (/shake|milk/.test(text)) return "shake";
  if (/fıstık|fistik|antep/.test(text)) return "pist";
  if (/dondurma/.test(text)) return "ice";
  if (/çikolata|cikolata|kakaо|kakao/.test(text)) return "choco";
  if (/meyve|çilek|cilek/.test(text)) return "fruit";
  if (/kaşar|kasar|tuzlu/.test(text)) return "savory";
  return "plain";
}

export function WaffleArt({ kind, className }: { kind: string; className?: string }) {
  const markup = ART[kind] ?? ART.plain;
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
