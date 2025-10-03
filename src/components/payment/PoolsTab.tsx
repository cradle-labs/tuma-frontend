"use client";

import { useState } from "react";
import { useHyperionPools } from "@/hooks/useHyperionPools";
import { Loader2, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Wallet } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { createLiquiditySingle } from "@/utils/index";
import { useCryptoBalances } from "@/hooks/useCryptoBalances";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useSupportedCurrencies } from "@/hooks/useSupportedCurrencies";

export function PoolsTab() {
  const { pools, isLoading, error, refetch } = useHyperionPools();
  const { connected, signAndSubmitTransaction } = useWallet();
  const { cryptoBalances, getBalanceBySymbol } = useCryptoBalances();
  const { cryptoCurrencies } = useSupportedCurrencies();
  const { toast } = useToast();
  const [expandedPoolId, setExpandedPoolId] = useState<string | null>(null);
  const [selectedTokenMode, setSelectedTokenMode] = useState<"token1" | "token2">("token1");
  const [tokenAmount, setTokenAmount] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);

  const toggleExpanded = (poolId: string) => {
    setExpandedPoolId(expandedPoolId === poolId ? null : poolId);
  };

  // Helper function to get token address by symbol from supported currencies
  const getTokenAddressBySymbol = (symbol: string): string | null => {
    const currency = cryptoCurrencies.find(currency => currency.symbol === symbol);
    return currency?.address || null;
  };

  const handleDeposit = async (poolData: any) => {
    if (!connected || !signAndSubmitTransaction || !tokenAmount || parseFloat(tokenAmount) <= 0) {
      return;
    }

    setIsDepositing(true);
    
    try {
      const token1 = poolData.pool.token1Info;
      const token2 = poolData.pool.token2Info;
      const selectedToken = selectedTokenMode === "token1" ? token1 : token2;
      
      console.log("Pool data structure:", poolData);
      console.log("Token1 info:", token1);
      console.log("Token2 info:", token2);
      console.log("Pool info:", poolData.pool);
      console.log("Available pool fields:", Object.keys(poolData.pool || {}));
      
      // Get token addresses using supported currencies lookup by symbol
      const token1Address = getTokenAddressBySymbol(token1.symbol);
      const token2Address = getTokenAddressBySymbol(token2.symbol);
      
      console.log("Token addresses from supported currencies:", { 
        token1Symbol: token1.symbol, 
        token1Address,
        token2Symbol: token2.symbol, 
        token2Address 
      });
      
      if (!token1Address || !token2Address) {
        throw new Error(`Missing token addresses. ${token1.symbol}: ${token1Address}, ${token2.symbol}: ${token2Address}`);
      }
      
      // Convert amount to proper decimal format
      const amountInDecimals = (parseFloat(tokenAmount) * Math.pow(10, selectedToken.decimals || 8)).toString();
      
      // Use simple positive tick values for the Hyperion contract
      // The contract likely expects different tick semantics than Uniswap V3
      const tickLower = 10000;  // Simple positive lower bound
      const tickUpper = 50000;  // Simple positive upper bound
      
      console.log("Using simple tick range:", { 
        originalCurrentTick: poolData.pool.currentTick,
        usingTickLower: tickLower, 
        usingTickUpper: tickUpper 
      });

      // Default parameters for zap in
      const zapParams = {
        token1Address,
        token2Address,
        poolIndex: parseInt(poolData.pool.poolIndex || "0"),
        tickLower,
        tickUpper,
        amountIn: amountInDecimals,
        slippageNumerator: 5,    // 5% slippage
        slippageDenominator: 100,
        thresholdNumerator: 95,  // 95% threshold
        thresholdDenominator: 100
      };

      console.log("Creating Hyperion liquidity position with params:", zapParams);
      
      const result = await createLiquiditySingle(signAndSubmitTransaction, zapParams);
      
      console.log("Liquidity position created successfully:", result);
      
      // Reset form
      setTokenAmount("");
      setExpandedPoolId(null);
      
      // Extract position ID from transaction result
      const positionId = result?.hash || result?.transactionHash || "unknown";
      
      // Get fee tier index from pool data
      const feeTierIndex = poolData.pool.feeRate ? 
        Math.floor(parseFloat(poolData.pool.feeRate) / 10000) : 0;
      
      // Build Hyperion position URL with correct format
      const hyperionUrl = `https://hyperion.xyz/position/${positionId}?currencyA=${token1Address}&currencyB=${token2Address}&feeTierIndex=${feeTierIndex}`;
      
      console.log("Hyperion position URL:", hyperionUrl);
      
      // Success toast with view position action
      toast({
        title: "🎉 Position Created Successfully!",
        description: `Liquidity position created for ${token1.symbol}/${token2.symbol} pool with ${tokenAmount} ${selectedToken.symbol}`,
        variant: "default",
        action: (
          <ToastAction
            altText="View Position"
            onClick={() => window.open(hyperionUrl, '_blank')}
          >
            View on Hyperion
          </ToastAction>
        )
      });
      
    } catch (error) {
      console.error("Error creating liquidity position:", error);
      
      // Error toast
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create position",
        variant: "destructive",
      });
    } finally {
      setIsDepositing(false);
    }
  };

  const renderLiquidityInterface = (poolData: any) => {
    const token1 = poolData.pool.token1Info;
    const token2 = poolData.pool.token2Info;
    const selectedToken = selectedTokenMode === "token1" ? token1 : token2;
    
    // Get real token balances using useCryptoBalances
    const token1Balance = getBalanceBySymbol(token1.symbol);
    const token2Balance = getBalanceBySymbol(token2.symbol);
    const selectedTokenBalance = selectedTokenMode === "token1" ? token1Balance : token2Balance;
    
    // Use formatted balance or "0" if not found
    const currentBalance = selectedTokenBalance?.balance.formatted || "0";

    return (
      <div className="mt-6 border-t border-white/10 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Add Liquidity</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Zap In:</span>
            <Switch
              checked={true}
              disabled={true}
              className="data-[state=checked]:bg-primary opacity-80"
            />
          </div>
        </div>

        {/* Token Mode Tabs */}
        <div className="flex gap-1 mb-6 bg-white/5 p-1 rounded-lg">
          <button
            onClick={() => {
              setSelectedTokenMode("token1");
              setTokenAmount(""); // Reset amount when switching tokens
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              selectedTokenMode === "token1"
                ? "bg-primary text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <div>{token1.symbol} ONLY</div>
            <div className="text-xs opacity-70">
              {parseFloat(token1Balance?.balance.formatted || "0").toFixed(4)}
            </div>
          </button>
          <button
            onClick={() => {
              setSelectedTokenMode("token2");
              setTokenAmount(""); // Reset amount when switching tokens
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              selectedTokenMode === "token2"
                ? "bg-primary text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <div>{token2.symbol} ONLY</div>
            <div className="text-xs opacity-70">
              {parseFloat(token2Balance?.balance.formatted || "0").toFixed(4)}
            </div>
          </button>
        </div>

        {/* Token Input */}
        <div className="bg-white/5 rounded-xl p-4 mb-6">
          {/* Token Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm">Token A</span>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Wallet className="h-3 w-3" />
              <span>{parseFloat(currentBalance).toFixed(6)} {selectedToken.symbol}</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-6 px-2 text-xs rounded-full"
                onClick={() => setTokenAmount((parseFloat(currentBalance) / 2).toString())}
                disabled={parseFloat(currentBalance) === 0}
              >
                Half
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-6 px-2 text-xs rounded-full"
                onClick={() => setTokenAmount(currentBalance)}
                disabled={parseFloat(currentBalance) === 0}
              >
                Max
              </Button>
            </div>
          </div>

          {/* Amount Input */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                type="number"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
                placeholder="0.00"
                className="bg-transparent border-none text-4xl font-semibold text-white placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
              />
              
            </div>
            
            {/* Token Selector */}
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-2">
              {selectedToken.symbol === "USDC" ? (
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">$</span>
                </div>
              ) : selectedToken.symbol === "USDt" || selectedToken.symbol === "USDT" ? (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">T</span>
                </div>
              ) : selectedToken.symbol === "APT" ? (
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-black">A</span>
                </div>
              ) : (
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-black">
                    {selectedToken.symbol.charAt(0)}
                  </span>
                </div>
              )}
              <span className="text-white font-medium">{selectedToken.symbol}</span>
            </div>
          </div>
        </div>

        {/* Deposit Button */}
        <Button 
          variant="primary" 
          className="w-full h-12 text-lg font-medium"
          disabled={
            !connected || 
            !tokenAmount || 
            parseFloat(tokenAmount) <= 0 || 
            parseFloat(tokenAmount) > parseFloat(currentBalance) ||
            isDepositing
          }
          onClick={() => handleDeposit(poolData)}
        >
          {!connected ? (
            "Connect Wallet"
          ) : parseFloat(tokenAmount) > parseFloat(currentBalance) ? (
            "Insufficient Balance"
          ) : isDepositing ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating Position...
            </div>
          ) : (
            "Deposit"
          )}
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h3 className="text-white text-lg font-medium">Available Pools</h3>
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
            <p className="text-gray-400 text-sm">Fetching pools...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertCircle className="h-6 w-6 text-red-400" />
            <div>
              <p className="text-red-400 text-sm font-medium">Failed to load pools</p>
              <p className="text-gray-500 text-xs mt-1">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Pools List */}
      {pools.length > 0 && (
        <div className="space-y-3">
          {pools.map((pool) => {
            const poolData = pool.data && pool.data.length > 0 ? pool.data[0] : null;
            const totalAPR = poolData ? parseFloat(poolData.feeAPR) + parseFloat(poolData.farmAPR) : 0;
            
            const isExpanded = expandedPoolId === pool.id;
            
            return (
            <div
              key={pool.id}
              className={`p-5 bg-gradient-to-r from-white/[0.08] to-white/[0.04] border border-white/10 rounded-xl hover:border-white/20 transition-all duration-200 group ${
                isExpanded ? 'border-primary/30' : ''
              }`}
            >
              {/* Loading State */}
              {pool.isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm text-gray-400">Loading {pool.name}...</span>
                  </div>
                </div>
              )}

              {/* Error State */}
              {pool.error && !pool.isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3 text-center">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div>
                      <p className="text-red-400 text-sm font-medium">{pool.name}</p>
                      <p className="text-red-300 text-xs">{pool.error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pool Data */}
              {poolData && !pool.isLoading && (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                        {pool.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">
                          {poolData.pool.token1Info.symbol}/{poolData.pool.token2Info.symbol}
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-400">
                          {(parseFloat(poolData.pool.feeRate) / 10000).toFixed(2)}% fee
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {totalAPR.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-400 uppercase tracking-wider">
                        APR
                      </div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-black/20 rounded-lg p-3">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                        TVL
                      </div>
                      <div className="text-lg font-semibold text-white">
                        ${parseFloat(poolData.tvlUSD) >= 1000000 
                          ? `${(parseFloat(poolData.tvlUSD) / 1000000).toFixed(1)}M`
                          : parseFloat(poolData.tvlUSD) >= 1000
                          ? `${(parseFloat(poolData.tvlUSD) / 1000).toFixed(0)}K`
                          : parseFloat(poolData.tvlUSD).toFixed(0)
                        }
                      </div>
                    </div>
                    
                    <div className="bg-black/20 rounded-lg p-3">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                        24H Volume
                      </div>
                      <div className="text-lg font-semibold text-white">
                        ${parseFloat(poolData.dailyVolumeUSD) >= 1000000 
                          ? `${(parseFloat(poolData.dailyVolumeUSD) / 1000000).toFixed(1)}M`
                          : parseFloat(poolData.dailyVolumeUSD) >= 1000
                          ? `${(parseFloat(poolData.dailyVolumeUSD) / 1000).toFixed(0)}K`
                          : parseFloat(poolData.dailyVolumeUSD).toFixed(0)
                        }
                      </div>
                    </div>
                  </div>

                  {/* APR Breakdown - Only show if farm APR exists */}
                  {parseFloat(poolData.farmAPR) > 0 && (
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-4 px-1">
                      <span>Fee APR: {parseFloat(poolData.feeAPR).toFixed(1)}%</span>
                      <span>Farm APR: {parseFloat(poolData.farmAPR).toFixed(1)}%</span>
                    </div>
                  )}

                  {/* Action Button */}
                  <Button 
                    variant="outline" 
                    className="w-full rounded-full"
                    disabled={!poolData}
                    onClick={() => toggleExpanded(pool.id)}
                  >
                    <span>Add Liquidity</span>
                    {isExpanded ? (
                      <ChevronUp className="ml-2 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-2 h-4 w-4" />
                    )}
                  </Button>

                  {/* Expanded Liquidity Interface */}
                  {isExpanded && renderLiquidityInterface(poolData)}
                </>
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && pools.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No pools available</p>
        </div>
      )}
    </div>
  );
}