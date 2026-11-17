/** Hosts our menu product images are served from; extend with CAMPAIGN_IMAGE_HOSTS (comma separated). */
export const CAMPAIGN_IMAGE_HOSTS: readonly string[] = [
  "images.algorycode.com",
  ...(process.env.CAMPAIGN_IMAGE_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean),
];

/** An https URL on one of the allowed hosts, with no credentials or custom port. */
export function isAllowedImageUrl(raw: string, hosts: readonly string[]): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    url.port === "" &&
    hosts.includes(url.hostname.toLowerCase())
  );
}
