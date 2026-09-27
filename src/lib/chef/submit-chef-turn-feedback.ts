export type ChefTurnFeedbackValue = "like" | "dislike";

export async function submitChefTurnFeedback(
  publicId: string,
  turnId: string,
  feedback: ChefTurnFeedbackValue,
): Promise<{ ok: boolean; status: number }> {
  const res = await fetch("/api/menu/chef/turn-feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId, turnId, feedback }),
  });
  return { ok: res.ok, status: res.status };
}
