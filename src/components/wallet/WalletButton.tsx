"use client";

import { useWallet, truncateAddress } from "@aptos-labs/wallet-adapter-react";
import { Button } from "../ui/button";

interface WalletButtonProps {
  onClick: () => void;
}

export function WalletButton({ onClick }: WalletButtonProps) {
  const { account, connected } = useWallet();

  return (
    <Button variant="primary" onClick={onClick}>
      {connected
        ? account?.ansName ||
          truncateAddress(account?.address?.toString()) ||
          "Unknown"
        : "Connect a Wallet"}
    </Button>
  );
}
