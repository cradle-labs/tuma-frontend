"use client";

import { useWallet, truncateAddress } from "@aptos-labs/wallet-adapter-react";
import { Copy, Eye, Power, Search, X, ArrowUpDown, ExternalLink } from "lucide-react";
import { Button } from "../ui/button";
import { useUserTokens } from "../../hooks/useUserTokens";

interface WalletHoldingsSheetProps {
  close: () => void;
  account: any;
}

export function WalletHoldingsSheet({ close, account }: WalletHoldingsSheetProps) {
  const { disconnect } = useWallet();
  const { coinBalances, isLoadingCoinBalances, coinBalancesError, refetchCoinBalances } = useUserTokens();
  
  const handleDisconnect = () => {
    disconnect();
    close();
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
          icon: symbol === "APT" ? "🟡" : "🔵",
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
            onClick={close}
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
            <button className="text-gray-400 hover:text-white transition-colors">
              <Eye className="h-4 w-4" />
            </button>
          </div>
          <div className="text-3xl font-bold text-white">{totalBalance}</div>
        </div>

        {/* Balance Categories */}
        <div className="mb-6">
          <div className="bg-green-600/20 border border-green-600/30 rounded-lg p-3">
            <div className="text-green-400 text-xs mb-1">Holdings ({allHoldings.length})</div>
            <div className="text-white font-semibold">{totalBalance}</div>
            {isLoadingCoinBalances && (
              <div className="text-gray-400 text-xs mt-1">Loading...</div>
            )}
            {coinBalancesError && (
              <div className="text-red-400 text-xs mt-1">
                Error loading tokens
                <button 
                  onClick={() => refetchCoinBalances()}
                  className="ml-2 underline hover:no-underline"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, symbol or address"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-12 pr-10 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-gray-600"
          />
          <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tokens Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">Tokens</span>
            <ArrowUpDown className="h-4 w-4 text-gray-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Balances (USD)</span>
            <ArrowUpDown className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Token Holdings */}
        <div className="space-y-3">
          {isLoadingCoinBalances ? (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="text-gray-400 text-center">Loading your tokens...</div>
            </div>
          ) : allHoldings.length > 0 ? (
            allHoldings.map((token, index) => (
              <div key={index} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                      <span className="text-lg">{token.icon}</span>
                    </div>
                    <div>
                      <div className="text-white font-semibold">{token.symbol}</div>
                      <div className="text-gray-400 text-sm truncate max-w-48">{token.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      className="text-gray-400 hover:text-white transition-colors"
                      onClick={() => {
                        const textToCopy = token.assetType || token.symbol;
                        navigator.clipboard.writeText(textToCopy);
                      }}
                      title="Copy asset type"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button className="text-gray-400 hover:text-white transition-colors">
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">{token.balance}</div>
                    <div className="text-gray-400 text-sm">{token.usdValue}</div>
                  </div>
                  {token.change && (
                    <div className={`text-sm font-medium ${
                      token.changePositive ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {token.change}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="text-gray-400 text-center">
                No tokens found
                <button 
                  onClick={() => refetchCoinBalances()}
                  className="ml-2 text-blue-400 hover:text-blue-300 underline"
                >
                  Refresh
                </button>
              </div>
            </div>
          )}
        </div>

        {/* View on Explorer Button */}
        <div className="mt-6">
          <Button variant="primary" className="w-full">
            View on Explorer
          </Button>
        </div>
      </div>
    </div>
  );
}
