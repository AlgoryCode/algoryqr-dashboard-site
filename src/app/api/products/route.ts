import axios, { AxiosError } from "axios";
import { NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/config";
import {
  fetchProductServiceProducts,
  isProductServiceConfigured,
} from "@/lib/server/product-service-catalog";

async function fetchQrServiceProducts() {
  const upstream = await axios.get(`${API_BASE_URL}/products`, {
    validateStatus: () => true,
    timeout: 20_000,
  });
  return NextResponse.json(upstream.data ?? [], { status: upstream.status });
}

export async function GET() {
  try {
    if (isProductServiceConfigured()) {
      try {
        const products = await fetchProductServiceProducts();
        return NextResponse.json(products);
      } catch {
        return fetchQrServiceProducts();
      }
    }

    return fetchQrServiceProducts();
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
