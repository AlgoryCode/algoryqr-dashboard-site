import axios, { AxiosError } from "axios";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import type { ChefChatSettings, ChefQuickOption } from "@/lib/chef/chef-quick-option";
import { buildUpstreamAuthHeaders } from "@/lib/auth-user";
import { API_BASE_URL } from "@/lib/config";
import { readAccessTokenFromCookies } from "@/lib/server/auth-cookies";
import {
  getChefChatSettings,
  setChefChatSettings,
} from "@/lib/server/chef-chat-settings-store";

const quickOptionSchema = z.object({
  id: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(80),
  target: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("chefRecommended") }),
    z.object({ kind: z.literal("popular") }),
    z.object({ kind: z.literal("tag"), slug: z.string().trim().min(1).max(64) }),
    z.object({ kind: z.literal("mainCategory"), mainCategoryId: z.number().int().positive() }),
    z.object({ kind: z.literal("subCategory"), subCategoryId: z.number().int().positive() }),
    z.object({
      kind: z.literal("products"),
      productIds: z.array(z.number().int().positive()).min(1).max(20),
    }),
  ]),
});

const bodySchema = z.object({
  welcomeMessage: z.string().trim().min(1).max(500),
  quickOptions: z.array(quickOptionSchema).max(12),
});

async function assertMenuAccess(menuId: string, accessToken: string): Promise<boolean> {
  const upstream = await axios.get(`${API_BASE_URL}/menu/${menuId}`, {
    headers: buildUpstreamAuthHeaders(accessToken),
    validateStatus: () => true,
    timeout: 15_000,
  });
  return upstream.status < 400;
}

export async function GET(_req: Request, context: { params: Promise<{ menuId: string }> }) {
  try {
    const cookieStore = await cookies();
    const accessToken = readAccessTokenFromCookies(cookieStore);
    if (!accessToken) return NextResponse.json({ message: "Access token yok" }, { status: 401 });

    const { menuId } = await context.params;
    const numericMenuId = Number(menuId);
    if (!Number.isInteger(numericMenuId) || numericMenuId <= 0) {
      return NextResponse.json({ message: "Geçersiz menü" }, { status: 400 });
    }

    const allowed = await assertMenuAccess(menuId, accessToken);
    if (!allowed) return NextResponse.json({ message: "Menü bulunamadı" }, { status: 404 });

    return NextResponse.json(getChefChatSettings(numericMenuId));
  } catch (error) {
    if (error instanceof AxiosError && error.response) {
      return NextResponse.json(error.response.data ?? {}, { status: error.response.status });
    }
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PUT(req: Request, context: { params: Promise<{ menuId: string }> }) {
  try {
    const cookieStore = await cookies();
    const accessToken = readAccessTokenFromCookies(cookieStore);
    if (!accessToken) return NextResponse.json({ message: "Access token yok" }, { status: 401 });

    const { menuId } = await context.params;
    const numericMenuId = Number(menuId);
    if (!Number.isInteger(numericMenuId) || numericMenuId <= 0) {
      return NextResponse.json({ message: "Geçersiz menü" }, { status: 400 });
    }

    const allowed = await assertMenuAccess(menuId, accessToken);
    if (!allowed) return NextResponse.json({ message: "Menü bulunamadı" }, { status: 404 });

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const settings: ChefChatSettings = {
      welcomeMessage: parsed.data.welcomeMessage,
      quickOptions: parsed.data.quickOptions as ChefQuickOption[],
    };

    return NextResponse.json(setChefChatSettings(numericMenuId, settings));
  } catch (error) {
    if (error instanceof AxiosError && error.response) {
      return NextResponse.json(error.response.data ?? {}, { status: error.response.status });
    }
    return NextResponse.json({ message: "Sunucu hatası" }, { status: 500 });
  }
}
