import { fn } from "storybook/test";
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { DashboardBannersProvider } from './dashboard-banners';

const meta = {
  component: DashboardBannersProvider,
} satisfies Meta<typeof DashboardBannersProvider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: null,
    onBanner: fn(),
  },
};