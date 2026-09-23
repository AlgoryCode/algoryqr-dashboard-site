import type { Preview } from "@storybook/nextjs-vite";

import { installApiMock } from "../src/storybook/install-api-mock";

import "../src/app/globals.css";

installApiMock();

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    apiFixture: "ready",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/dashboard/genel-bakis",
        query: {},
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
