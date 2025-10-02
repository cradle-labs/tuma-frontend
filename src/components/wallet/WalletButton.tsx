"use client";

import { useWallet, truncateAddress } from "@aptos-labs/wallet-adapter-react";
import { Button } from "../ui/button";
import { TransactionHistoryDialog } from "./TransactionHistoryDialog";
import { History } from "lucide-react";

interface WalletButtonProps {
  onClick: () => void;
}

export function WalletButton({ onClick }: WalletButtonProps) {
  const { account, connected } = useWallet();

  return (
    <div className="flex items-center gap-2">
      <Button variant="primary" onClick={onClick}>
        {connected
          ? account?.ansName ||
            truncateAddress(account?.address?.toString()) ||
            "Unknown"
          : "Connect a Wallet"}
      </Button>
      {connected && (
        <TransactionHistoryDialog>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10 w-10 p-0 rounded-full"
            title="View Transaction History"
          >
            <History className="h-4 w-4" />
          </Button>
        </TransactionHistoryDialog>
      )}
    </div>
  );
}
