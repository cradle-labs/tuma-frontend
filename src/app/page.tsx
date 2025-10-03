"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import { WalletSelector as ShadcnWalletSelector } from "@/components/WalletSelector";

import { Network } from "@aptos-labs/ts-sdk";

import {
  AccountInfo,
  AdapterWallet,
  AptosChangeNetworkOutput,
  NetworkInfo,
} from "@aptos-labs/wallet-adapter-react";
import { init as initTelegram } from "@telegram-apps/sdk";

// Imports for registering a browser extension wallet plugin on page load
import { MyWallet } from "@/utils/standardWallet";
import { registerWallet } from "@aptos-labs/wallet-standard";
import { Payment } from "@/components/payment/Payment";
import { Spotlight } from "@/components/SpotlightNew";
import Image from "next/image";

// Example of how to register a browser extension wallet plugin.
// Browser extension wallets should call registerWallet once on page load.
// When you click "Connect Wallet", you should see "Example Wallet"
(function () {
  if (typeof window === "undefined") return;
  const myWallet = new MyWallet();
  registerWallet(myWallet);
})();

const isTelegramMiniApp =
  typeof window !== "undefined" &&
  (window as any).TelegramWebviewProxy !== undefined;
if (isTelegramMiniApp) {
  initTelegram();
}

export default function Home() {
  return (
    <div className="w-full bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-x-hidden overflow-y-auto">
      {/* Navbar */}
      <nav className="top-0 left-0 right-0 z-50  backdrop-blur-sm border-b border-white/10">
        <div className="flex justify-between items-center px-6 py-4">
          <div>
            <Image 
              src="/images/logo-white.png" 
              alt="Tooma Logo" 
              className="h-8 w-auto"
              width={32}
              height={32}
            />
          </div>
          <div className="flex items-center gap-2">
            <WalletSelection />
          </div>
        </div>
      </nav>

      <Spotlight />
      <div className="flex md:items-center md:justify-center pt-6">
        <div className="px-4 max-w-md mx-auto relative z-10 w-full">
          <Payment />
        </div>
      </div>
    </div>
  );
}

function WalletSelection() {
  return (
    <div className="">
      <div className="">
        <ShadcnWalletSelector />
      </div>
    </div>
  );
}
