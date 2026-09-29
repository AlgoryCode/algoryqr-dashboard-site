import { getMyActiveMenusRequest } from "@/lib/api";
import { listBranchesRequest } from "@/lib/branch";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function isDemoStoreReady(): Promise<boolean> {
  try {
    const branchResponse = await listBranchesRequest();
    const branches = branchResponse.content ?? [];
    if (branches.length === 0) {
      return false;
    }
    const menus = await getMyActiveMenusRequest();
    return menus.length > 0;
  } catch {
    return false;
  }
}

export async function waitForDemoStoreReady(maxMs = 90_000, intervalMs = 1_500): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    if (await isDemoStoreReady()) {
      return true;
    }
    await sleep(intervalMs);
  }
  return false;
}
