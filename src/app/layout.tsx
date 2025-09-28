import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import "./globals.css";

import { ThemeProvider } from "@/components/ThemeProvider";
import { WalletProvider } from "@/components/WalletProvider";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { PropsWithChildren } from "react";
import { AutoConnectProvider } from "@/components/AutoConnectProvider";
import { ReactQueryClientProvider } from "@/components/ReactQueryClientProvider";
import { TransactionSubmitterProvider } from "@/components/TransactionSubmitterProvider";

export const metadata: Metadata = {
  title: "Tooma",
  description:
    "Spend crypto in Africa",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "flex justify-center min-h-screen font-polysans antialiased",
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AutoConnectProvider>
            <ReactQueryClientProvider>
              <TransactionSubmitterProvider>
                <WalletProvider>
                  {children}
                  <Toaster />
                </WalletProvider>
              </TransactionSubmitterProvider>
            </ReactQueryClientProvider>
          </AutoConnectProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
