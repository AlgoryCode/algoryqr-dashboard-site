import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import DashboardPageClient from "@/views/dashboard/DashboardPageClient";

import { DashboardStory } from "./dashboard-story";
import type { ApiFixtureMode } from "./fixtures";

export const dashboardPageMeta = {
  component: DashboardPageClient,
  decorators: [
    (Story, context) => {
      const mode: ApiFixtureMode = context.parameters.apiFixture === "setup" ? "setup" : "ready";
      return (
        <DashboardStory mode={mode}>
          <Story />
        </DashboardStory>
      );
    },
  ],
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
} satisfies Meta<typeof DashboardPageClient>;

type PageStory = StoryObj<typeof dashboardPageMeta>;

export function dashboardPage(
  name: string,
  pathname: string,
  query: Record<string, string> = {},
  apiFixture: ApiFixtureMode = "ready",
): PageStory {
  return {
    name,
    parameters: {
      apiFixture,
      nextjs: {
        appDirectory: true,
        navigation: { pathname, query },
      },
    },
  };
}
