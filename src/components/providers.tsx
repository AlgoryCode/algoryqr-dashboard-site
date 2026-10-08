"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/hooks/use-theme";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { DocumentLocale } from "@/components/DocumentLocale";
import { FlowLogDock } from "@/components/flow-log/FlowLogDock";
import { MenuLocaleProvider } from "@/components/menu-templates/shared/menu-locale";
import { MenuCurrencyProvider } from "@/components/menu-templates/shared/menu-currency";

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MenuLocaleProvider>
          <MenuCurrencyProvider>
            <DocumentLocale />
            <TooltipProvider>
              {children}
              <Toaster />
              <Sonner />
              <FlowLogDock />
            </TooltipProvider>
          </MenuCurrencyProvider>
        </MenuLocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
