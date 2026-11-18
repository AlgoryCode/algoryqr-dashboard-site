import axios, { AxiosError } from "axios";
import { NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/config";
import { packagesUpstreamUrl } from "@/lib/server/packages-upstream";
import {
  fetchProductServicePackages,
  isProductServiceConfigured,
} from "@/lib/server/product-service-catalog";

async function fetchQrServicePackages() {
  const upstream = await axios.get(packagesUpstreamUrl(API_BASE_URL), {
    validateStatus: () => true,
    timeout: 20_000,
  });
  return NextResponse.json(upstream.data ?? [], { status: upstream.status });
}

export async function GET() {
  try {
    if (isProductServiceConfigured()) {
      try {
        const packages = await fetchProductServicePackages();
        return NextResponse.json(packages);
      } catch {
        return fetchQrServicePackages();
      }
    }

    return fetchQrServicePackages();
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.code === "ECONNABORTED") {
        return NextResponse.json({ message: "Gateway timeout" }, { status: 504 });
      }
      if (error.response) {
        return NextResponse.json(error.response.data ?? [], { status: error.response.status });
      }
    }
    return NextResponse.json({ message: "Sunucu hatası", detail: String(error) }, { status: 500 });
  }
}
