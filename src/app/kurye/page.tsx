import { redirect } from "next/navigation";

/** The courier screen is what a courier sees after staff login; there is no owner view. */
export default function CourierPage() {
  redirect("/personel");
}
