import axios, { AxiosError } from "axios";
import { NextResponse } from "next/server";
import { z } from "zod";

import { API_BASE_URL } from "@/lib/config";

const bodySchema = z.object({
  publicId: z.string().trim().min(1).max(128),
  turnId: z.string().trim().min(1).max(128),
  feedback: z.enum(["like", "dislike"]),
});

/**
 * Persists guest feedback on a stored chef chat turn (backend column: like / dislike).
 * Upstream: PATCH menu/public/{publicId}/chef-chat/turns/{turnId}/feedback
 */
export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { publicId, turnId, feedback } = parsed.data;
    const upstream = await axios.patch(
      `${API_BASE_URL}/menu/public/${encodeURIComponent(publicId)}/chef-chat/turns/${encodeURIComponent(turnId)}/feedback`,
      { feedback: feedback === "like" ? "LIKE" : "DISLIKE" },
      {
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        validateStatus: () => true,
        timeout: 15_000,
      },
    );

    if (upstream.status === 404) {
      return NextResponse.json({ message: "Turn not found" }, { status: 404 });
    }

    return NextResponse.json(upstream.data ?? { ok: true }, { status: upstream.status });
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.code === "ECONNABORTED") {
        return NextResponse.json({ message: "Gateway timeout" }, { status: 504 });
      }
      if (error.response) {
        return NextResponse.json(error.response.data ?? {}, { status: error.response.status });
      }
    }
    return NextResponse.json({ message: "Sunucu hatası", detail: String(error) }, { status: 500 });
  }
}
