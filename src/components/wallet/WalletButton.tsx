"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useWallet, truncateAddress } from "@aptos-labs/wallet-adapter-react";
import { Button } from "../ui/button";
import { TransactionHistoryDialog } from "./TransactionHistoryDialog";
import { HyperionYieldSheet } from "../payment/HyperionYieldSheet";
import { History, TrendingUp } from "lucide-react";

interface WalletButtonProps {
  onClick: () => void;
}

export function WalletButton({ onClick }: WalletButtonProps) {
  const { account, connected } = useWallet();
  const [isHyperionSheetOpen, setIsHyperionSheetOpen] = useState(false);

  const closeHyperionSheet = useCallback(() => setIsHyperionSheetOpen(false), []);

  // Handle escape key for Hyperion sheet
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isHyperionSheetOpen) {
        closeHyperionSheet();
      }
    };

    if (isHyperionSheetOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isHyperionSheetOpen, closeHyperionSheet]);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={onClick}>
          {connected
            ? account?.ansName ||
              truncateAddress(account?.address?.toString()) ||
              "Unknown"
            : "Connect a Wallet"}
        </Button>
        {connected && (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-10 w-10 p-0 rounded-full"
              title="Earn Yield on Hyperion"
              onClick={() => setIsHyperionSheetOpen(true)}
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
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
          </>
        )}
      </div>
      {isHyperionSheetOpen && createPortal(
        <div className="fixed inset-0 z-[100] pointer-events-none">
          <div className="fixed inset-y-0 right-0 w-full sm:w-3/4 sm:max-w-md bg-[#0A0A0A] border-l border-gray-700 flex flex-col h-full pointer-events-auto shadow-lg animate-in slide-in-from-right duration-500">
            <HyperionYieldSheet close={closeHyperionSheet} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
