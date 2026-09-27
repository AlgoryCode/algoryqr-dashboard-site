import { NextResponse } from "next/server";
import { z } from "zod";

import { getChefChatPublicConfig } from "@/lib/chef/chef-chat-public-config";

const querySchema = z.object({
  publicId: z.string().trim().min(1).max(128),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    publicId: url.searchParams.get("publicId"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const config = await getChefChatPublicConfig(parsed.data.publicId);

  return NextResponse.json({
    welcomeMessage: config.welcomeMessage,
    badges: config.badges,
  });
}
