"use client";

import {
  AdapterNotDetectedWallet,
  AdapterWallet,
  useWallet,
  WalletItem,
} from "@aptos-labs/wallet-adapter-react";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";

interface AptosConnectWalletRowProps {
  wallet: AdapterWallet | AdapterNotDetectedWallet;
  onConnect?: () => void;
}

export function AptosConnectWalletRow({ wallet, onConnect }: AptosConnectWalletRowProps) {
  const { isLoading } = useWallet();
  
  return (
    <WalletItem wallet={wallet} onConnect={onConnect}>
      <WalletItem.ConnectButton asChild>
        <Button 
          size="lg" 
          className="w-full gap-4 bg-white/10 hover:bg-primary hover:text-black text-white h-14 px-4 justify-start"
          disabled={isLoading}
          >
          <WalletItem.Icon className="h-6 w-6 hover:bg-black" />
          <div className="flex items-center justify-between w-full">
            <WalletItem.Name className="text-base font-normal" />
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
          </div>
        </Button>
      </WalletItem.ConnectButton>
    </WalletItem>
  );
}
