"use client";

import {
  AdapterNotDetectedWallet,
  AdapterWallet,
  isInstallRequired,
  useWallet,
  WalletItem,
} from "@aptos-labs/wallet-adapter-react";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";

interface WalletRowProps {
  wallet: AdapterWallet | AdapterNotDetectedWallet;
  onConnect?: () => void;
}

export function WalletRow({ wallet, onConnect }: WalletRowProps) {
  const isInstalled = !isInstallRequired(wallet);
  const { isLoading } = useWallet();
  
  return (
    <WalletItem
      wallet={wallet}
      onConnect={onConnect}
      className="flex items-center justify-between px-4 py-4 gap-4 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
    >
      <div className="flex items-center gap-4">
        <WalletItem.Icon className="h-6 w-6" />
        <div className="flex flex-col">
          <WalletItem.Name className="text-base font-normal text-white" />
          <span className="text-sm text-gray-400">
            {isInstalled ? "Detected" : "Not Installed"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        
        {isInstallRequired(wallet) ? (
          <Button size="sm" variant="outline" className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600" asChild>
            <WalletItem.InstallLink />
          </Button>
        ) : (
          <WalletItem.ConnectButton asChild>
            <Button size="sm" variant="primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </WalletItem.ConnectButton>
        )}
      </div>
    </WalletItem>
  );
}
