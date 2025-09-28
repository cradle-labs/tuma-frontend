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
    <main className="flex flex-col h-screen w-full p-6 pb-12  gap-6">
      <div className="flex justify-between gap-6 pb-10">
        <div>
          <h1 className="text-md sm:text-lg font-semibold tracking-tight">
            Aptos Send
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <WalletSelection />
        </div>
      </div>
      <div className="flex justify-center items-center w-full">
        <div className="w-full max-w-lg">
          <Payment />
        </div>
      </div>

      {/* create pay, withdraw and deposit components */}
    </main>
  );
}

function WalletSelection() {
  // const { autoConnect, setAutoConnect } = useAutoConnect();

  return (
    <>
      <div className="">
        <div className="">
          <ShadcnWalletSelector />
        </div>
      </div>
    </>
  );
}
interface WalletConnectionProps {
  account: AccountInfo | null;
  network: NetworkInfo | null;
  wallet: AdapterWallet | null;
  changeNetwork: (network: Network) => Promise<AptosChangeNetworkOutput>;
}
