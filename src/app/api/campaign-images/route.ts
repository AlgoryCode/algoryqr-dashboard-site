import axios, { AxiosError } from "axios";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AI_SERVICE_API_KEY, AI_SERVICE_BASE_URL } from "@/lib/config";
import { CAMPAIGN_IMAGE_HOSTS, isAllowedImageUrl } from "@/lib/server/campaign-image-hosts";
import { requireProduct } from "@/lib/server/product-gate";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  slogan: z.string().trim().max(255).optional(),
  brief: z.string().trim().max(1000).optional(),
  productNames: z.array(z.string().trim().min(1)).max(8).default([]),
  productImageUrls: z.array(z.string().trim().min(1).max(2048)).max(4).default([]),
});

type UpstreamResponse = {
  imageBase64?: string;
  contentType?: string;
  model?: string;
  promptVersion?: string;
  message?: string;
  detail?: string;
};

export async function POST(request: Request) {
  try {
    // Campaigns are run from the waiter panel; the image generator belongs to the same plan.
    const gate = await requireProduct("WAITER_PANEL");
    if (!gate.ok) {
      return NextResponse.json({ message: gate.message }, { status: gate.status });
    }

    if (!AI_SERVICE_API_KEY) {
      return NextResponse.json(
        { message: "AI servisi yapılandırılmamış" },
        { status: 503 },
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const upstream = await axios.post<UpstreamResponse>(
      `${AI_SERVICE_BASE_URL}/api/v1/campaign-images`,
      {
        name: parsed.data.name,
        slogan: parsed.data.slogan,
        brief: parsed.data.brief,
        productNames: parsed.data.productNames,
        // The AI service downloads these, so only our own image hosts are passed on.
        productImageUrls: parsed.data.productImageUrls.filter((url) => isAllowedImageUrl(url, CAMPAIGN_IMAGE_HOSTS)),
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-API-Key": AI_SERVICE_API_KEY,
        },
        validateStatus: () => true,
        timeout: 130_000,
      },
    );

    if (upstream.status >= 400) {
      const message =
        upstream.data?.message ||
        upstream.data?.detail ||
        "Kampanya görseli üretilemedi";
      return NextResponse.json(
        { message },
        { status: upstream.status >= 500 ? 502 : upstream.status },
      );
    }

    const imageBase64 = (upstream.data?.imageBase64 ?? "").trim();
    if (!imageBase64) {
      return NextResponse.json(
        { message: "AI boş görsel döndü" },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        imageBase64,
        contentType: upstream.data?.contentType ?? "image/png",
        model: upstream.data?.model ?? null,
        promptVersion: upstream.data?.promptVersion ?? null,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.code === "ECONNABORTED") {
        return NextResponse.json({ message: "Gateway timeout" }, { status: 504 });
      }
      if (error.response) {
        return NextResponse.json(
          {
            message:
              (error.response.data as { message?: string; detail?: string } | undefined)
                ?.message ||
              (error.response.data as { detail?: string } | undefined)?.detail ||
              "Upstream error",
          },
          { status: error.response.status >= 500 ? 502 : error.response.status },
        );
      }
    }
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
