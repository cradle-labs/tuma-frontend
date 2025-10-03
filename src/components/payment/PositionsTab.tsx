"use client";

import { useHyperionPositions } from "@/hooks/useHyperionPositions";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Loader2, AlertCircle, RefreshCw, Wallet, TrendingUp, DollarSign } from "lucide-react";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { useSupportedCurrencies } from "@/hooks/useSupportedCurrencies";

export function PositionsTab() {
  const { connected, account } = useWallet();
  const { positions, isLoading, error, refetch } = useHyperionPositions();
  const { cryptoCurrencies } = useSupportedCurrencies();
  const router = useRouter();

  // Helper function to get token address by symbol from supported currencies
  const getTokenAddressBySymbol = (symbol: string): string | null => {
    const currency = cryptoCurrencies.find(currency => currency.symbol === symbol);
    return currency?.address || null;
  };

  // Handle manage position redirect
  const handleManagePosition = (position: any) => {
    if (position?.position?.objectId) {
      const objectId = position.position.objectId;
      
      // Get token symbols from position data
      const token1Symbol = position?.position?.pool?.token1Info?.symbol;
      const token2Symbol = position?.position?.pool?.token2Info?.symbol;
      
      // Get token addresses using supported currencies lookup
      const token1Address = getTokenAddressBySymbol(token1Symbol);
      const token2Address = getTokenAddressBySymbol(token2Symbol);
      
      // Get fee tier index from pool data
      const feeTierIndex = position?.position?.pool?.feeRate ? 
        Math.floor(parseFloat(position.position.pool.feeRate) / 10000) : 0;
      
      // Build dynamic Hyperion position URL
      const hyperionUrl = `https://hyperion.xyz/position/${objectId}?currencyA=${token1Address}&currencyB=${token2Address}&feeTierIndex=${feeTierIndex}`;
      
      console.log("Opening Hyperion position:", {
        objectId,
        token1Symbol,
        token2Symbol,
        token1Address,
        token2Address,
        feeTierIndex,
        url: hyperionUrl
      });
      
      // Open Hyperion position page in a new tab
      window.open(hyperionUrl, '_blank');
    }
  };

  // Helper function to calculate total unclaimed rewards
  const getTotalUnclaimedUSD = (position: any) => {
    if (!position) return 0;
    
    const feesUSD = position.fees?.unclaimed?.reduce((total: number, fee: any) => 
      total + parseFloat(fee?.amountUSD || "0"), 0
    ) || 0;
    
    const subsidyUSD = position.subsidy?.unclaimed?.reduce((total: number, subsidy: any) => 
      total + parseFloat(subsidy?.amountUSD || "0"), 0
    ) || 0;
    
    return feesUSD + subsidyUSD;
  };

  // Helper function to format token symbols
  const getTokenPairName = (position: any) => {
    if (!position?.position?.pool?.token1Info?.symbol || !position?.position?.pool?.token2Info?.symbol) {
      return "Unknown Pair";
    }
    const token1 = position.position.pool.token1Info.symbol;
    const token2 = position.position.pool.token2Info.symbol;
    return `${token1}/${token2}`;
  };

  // Helper function to get position status
  const getPositionStatus = (position: any) => {
    if (!position?.position?.pool || typeof position.position.tickLower !== 'number' || typeof position.position.tickUpper !== 'number') {
      return { status: "Unknown", color: "text-gray-400" };
    }
    
    const currentTick = position.position.pool.currentTick;
    const tickLower = position.position.tickLower;
    const tickUpper = position.position.tickUpper;
    
    if (typeof currentTick !== 'number') {
      return { status: "Unknown", color: "text-gray-400" };
    }
    
    if (currentTick >= tickLower && currentTick <= tickUpper) {
      return { status: "In Range", color: "text-green-400" };
    } else {
      return { status: "Out of Range", color: "text-yellow-400" };
    }
  };

  if (!connected) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Connect Your Wallet</h3>
          <p className="text-gray-400 text-sm">
            Connect your wallet to view your liquidity positions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h3 className="text-white text-lg font-medium">Your Positions</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={refetch}
          disabled={isLoading}
          className="h-8 px-3"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-gray-400 text-sm">Fetching your positions...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertCircle className="h-6 w-6 text-red-400" />
            <div>
              <p className="text-red-400 text-sm font-medium">Failed to load positions</p>
              <p className="text-gray-500 text-xs mt-1">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Positions List */}
      {!isLoading && !error && positions.length > 0 && (
        <div className="space-y-3">
          {positions.map((position, index) => {
            const unclaimedUSD = getTotalUnclaimedUSD(position);
            const positionStatus = getPositionStatus(position);
            const tokenPair = getTokenPairName(position);
            
            return (
              <div
                key={position.position.objectId}
                className="p-5 bg-gradient-to-r from-white/[0.08] to-white/[0.04] border border-white/10 rounded-xl hover:border-white/20 transition-all duration-200"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {tokenPair}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs font-medium ${positionStatus.color}`}>
                        {positionStatus.status}
                      </span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-400">
                        Fee: {position?.position?.pool?.feeRate ? (parseFloat(position.position.pool.feeRate) / 10000).toFixed(2) : "0.00"}%
                      </span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className={`text-xs font-medium ${position?.isActive ? "text-green-400" : "text-red-400"}`}>
                        {position?.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">
                      ${parseFloat(position.value || "0").toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">
                      Position Value
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-3 w-3 text-green-400" />
                      <div className="text-xs text-gray-400 uppercase tracking-wider">
                        Unclaimed Rewards
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-green-400">
                      ${unclaimedUSD.toFixed(4)}
                    </div>
                  </div>
                  
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-3 w-3 text-blue-400" />
                      <div className="text-xs text-gray-400 uppercase tracking-wider">
                        Range
                      </div>
                    </div>
                    <div className="text-sm font-medium text-white">
                      {position?.position?.tickLower ?? "?"} - {position?.position?.tickUpper ?? "?"}
                    </div>
                  </div>
                </div>

                {/* Unclaimed Details */}
                {unclaimedUSD > 0 && (
                  <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="text-xs text-green-400 font-medium mb-2">Unclaimed Breakdown:</div>
                    <div className="space-y-1">
                      {position?.fees?.unclaimed?.map((fee: any, idx: number) => (
                        parseFloat(fee?.amountUSD || "0") > 0 && (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-gray-400">Fees:</span>
                            <span className="text-green-400">${parseFloat(fee?.amountUSD || "0").toFixed(4)}</span>
                          </div>
                        )
                      )) || []}
                      {position?.subsidy?.unclaimed?.map((subsidy: any, idx: number) => (
                        parseFloat(subsidy?.amountUSD || "0") > 0 && (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-gray-400">Rewards:</span>
                            <span className="text-green-400">${parseFloat(subsidy?.amountUSD || "0").toFixed(4)}</span>
                          </div>
                        )
                      )) || []}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-10 rounded-full"
                    onClick={() => handleManagePosition(position)}
                  >
                    Manage Position
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && positions.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Positions Found</h3>
          <p className="text-gray-400 text-sm mb-4">
            You don&apos;t have any liquidity positions yet
          </p>
          <Button variant="primary">
            Add Your First Position
          </Button>
        </div>
      )}
    </div>
  );
}