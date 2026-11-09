import { notFound } from "next/navigation";

/** Target of the proxy's rewrite for unknown addresses, which would otherwise reach the panel's catch-all route. */
export default function UnknownPage() {
  notFound();
}
