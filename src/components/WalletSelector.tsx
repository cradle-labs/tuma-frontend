"use client";

import { WalletSortingOptions, useWallet } from "@aptos-labs/wallet-adapter-react";
import { useCallback, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useToast } from "./ui/use-toast";
import { WalletButton, ConnectWalletSheet, WalletHoldingsSheet } from "./wallet";

export function WalletSelector(walletSortingOptions: WalletSortingOptions) {
  const { account, connected } = useWallet();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const closeSheet = useCallback(() => setIsSheetOpen(false), []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isSheetOpen) {
        closeSheet();
      }
    };

    if (isSheetOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSheetOpen, closeSheet]);

  return (
    <>
      <WalletButton onClick={() => setIsSheetOpen(true)} />
      {isSheetOpen && createPortal(
        <div className="fixed inset-0 z-[100] pointer-events-none">
          <div className="fixed inset-y-0 right-0 w-full sm:w-3/4 sm:max-w-md bg-[#0A0A0A] border-l border-gray-700 flex flex-col h-full pointer-events-auto shadow-lg animate-in slide-in-from-right duration-500">
            {connected ? (
              <WalletHoldingsSheet closeAction={closeSheet} account={account} />
            ) : (
              <ConnectWalletSheet close={closeSheet} {...walletSortingOptions} />
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

