export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { installUpstreamFlowLog } = await import("@/lib/server/upstream-flow-log");
  installUpstreamFlowLog();
}
