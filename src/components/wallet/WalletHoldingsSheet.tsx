"use client";

import { useWallet, truncateAddress } from "@aptos-labs/wallet-adapter-react";
import { Eye, Power } from "lucide-react";
import { Button } from "../ui/button";
import { useUserTokens } from "../../hooks/useUserTokens";
import { useUserAssets } from "../../hooks/useUserAssets";
import { EmbeddedTokenList } from "./EmbeddedTokenList";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface WalletHoldingsSheetProps {
  closeAction: () => void;
  account: any;
}

export function WalletHoldingsSheet({ closeAction, account }: WalletHoldingsSheetProps) {
  const router = useRouter();
  const { disconnect } = useWallet();
  const { coinBalances, isLoadingCoinBalances, coinBalancesError, refetchCoinBalances } = useUserTokens();
  const { userAssets, isLoadingAssets } = useUserAssets();
  
  const handleDisconnect = () => {
    disconnect();
    closeAction();
  };

  // Format coin balances for display
  const formatCoinBalances = () => {
    if (!coinBalances || !Array.isArray(coinBalances)) return [];
    
    return coinBalances
      .filter((asset) => asset && asset.asset_type && asset.amount)
      .map((asset) => {
        // Extract symbol and name from asset_type or use defaults
        let symbol = "Unknown";
        let name = asset.asset_type;
        const decimals = 8;
        
        // Handle special case for APT
        if (asset.asset_type?.includes("::aptos_coin::AptosCoin")) {
          symbol = "APT";
          name = "Aptos Coin";
        } else if (asset.asset_type?.includes("::")) {
          // Extract the last part after the last ::
          const parts = asset.asset_type.split("::");
          if (parts.length > 0) {
            symbol = parts[parts.length - 1];
            name = symbol;
          }
        }
        
        // Convert amount using correct decimals
        const amount = asset.amount || "0";
        const balance = (parseInt(amount) / Math.pow(10, decimals)).toFixed(8);
        
        return {
          symbol,
          name,
          icon: symbol === "APT" ? "aptos" : "🔵",
          balance,
          usdValue: "~$0.00", // Would need price API for real USD values
          change: "+0.00%",
          changePositive: true,
          assetType: asset.asset_type,
        };
      });
  };

  const allHoldings = formatCoinBalances();
  const totalBalance = `${allHoldings.length} tokens`;

  // Calculate total USD value of all assets
  const totalUSDValue = userAssets.reduce((total, asset) => {
    return total + (asset.usdValue || 0);
  }, 0);

  return (
    <div className="w-full h-full flex flex-col bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              {account?.ansName ? account.ansName.charAt(0).toUpperCase() : 
               account?.address ? account.address.toString().charAt(0).toUpperCase() : '?'}
            </span>
          </div>
          <span className="text-white font-semibold">
            {account?.ansName || 
             (account?.address ? truncateAddress(account.address.toString()) : 'Unknown')}
          </span>
        </div>
        <div className="flex items-center  gap-4">
          <button 
            onClick={handleDisconnect}
            className="text-red-500 hover:text-red-400 transition-colors"
            title="Disconnect wallet"
          >
            <Power className="h-5 w-5" />
          </button>
          <button 
            onClick={closeAction}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Esc
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4">
        {/* Total Balance */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Balance</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {isLoadingAssets ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Loading...</span>
              </div>
            ) : (
              `$ ${totalUSDValue.toFixed(2)}`
            )}
          </div>
          <div className="text-primary text-sm mt-1">
            {totalBalance}
          </div>
        </div>

        {/* Token List Display */}
        <div className="flex-1">
          <EmbeddedTokenList />
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          <Button variant="primary" className="w-full">
            <Link target="_blank" href={`https://explorer.aptoslabs.com/account/${account?.address?.toString()}`}>
            View on Explorer
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
