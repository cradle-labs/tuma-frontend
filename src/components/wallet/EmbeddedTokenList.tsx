"use client";

import { useState, useMemo } from "react";
import { Copy, ExternalLink, Search, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useUserTokens } from "../../hooks/useUserTokens";
import { useTokenPrices } from "../../hooks/useTokenPrices";
import { useExchangeRate } from "../../hooks/useExchangeRate";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import Image from "next/image";
import tokenList from "../../utils/token-list.json";

interface Token {
  chainId: number;
  tokenAddress: string | null;
  faAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  bridge: string | null;
  panoraSymbol: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  panoraUI: boolean;
  panoraTags: string[];
  panoraIndex: number;
  coinGeckoId: string | null;
  coinMarketCapId: number | null;
}

interface EmbeddedTokenListProps {
  selectedCurrency?: "USD" | "KES";
}

export function EmbeddedTokenList({ selectedCurrency = "KES" }: EmbeddedTokenListProps) {
  const { network } = useWallet();
  const { coinBalances, isLoadingCoinBalances } = useUserTokens();
  const { exchangeRate } = useExchangeRate("KES");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  // Get all unique panoraTags, excluding "Banned"
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    tokenList.forEach((token: Token) => {
      token.panoraTags.forEach((tag) => {
        if (tag !== "Banned") {
          tags.add(tag);
        }
      });
    });
    return Array.from(tags).sort();
  }, []);

  // Get network name for explorer links
  const getNetworkName = () => {
    if (network?.name === "testnet") return "testnet";
    if (network?.name === "devnet") return "devnet";
    if (network?.name === "mainnet") return "mainnet";
    return "testnet"; // default fallback
  };

  // Check if user has balance for a token
  const getUserBalance = (faAddress: string) => {
    if (!coinBalances || !Array.isArray(coinBalances)) return null;

    // Find the token in our token list first to get tokenAddress
    const token = tokenList.find(
      (token: Token) => token.faAddress === faAddress
    );
    if (!token) return null;

    // Find the user's asset by matching the asset_type with the tokenAddress
    const userAsset = coinBalances.find((asset) => {
      if (!asset.asset_type) return false;

      // Primary match: exact match with tokenAddress
      if (token.tokenAddress && asset.asset_type === token.tokenAddress) {
        return true;
      }

      // For APT (faAddress: "0xa"), check for aptos_coin
      if (
        faAddress === "0xa" &&
        asset.asset_type.includes("::aptos_coin::AptosCoin")
      ) {
        return true;
      }

      // Fallback: check if the asset_type contains the faAddress (for FA addresses)
      if (
        faAddress.length > 10 &&
        asset.asset_type.toLowerCase().includes(faAddress.toLowerCase())
      ) {
        return true;
      }

      return false;
    });

    if (
      userAsset &&
      userAsset.amount &&
      parseInt(userAsset.amount.toString()) > 0
    ) {
      const decimals = token.decimals || 8;
      const balance =
        parseInt(userAsset.amount.toString()) / Math.pow(10, decimals);

      // Only return balance if it's greater than 0
      if (balance > 0) {
        // Format the balance to show meaningful digits
        if (balance >= 1) {
          return balance.toFixed(2);
        } else if (balance >= 0.01) {
          return balance.toFixed(4);
        } else {
          return balance.toFixed(8);
        }
      }
    }

    return null;
  };

  // Get unique faAddresses for price fetching - only for tokens user owns
  const faAddresses = useMemo(() => {
    const addresses = new Set<string>();
    
    // Only fetch prices for tokens the user actually owns
    if (coinBalances && Array.isArray(coinBalances)) {
      coinBalances.forEach((asset) => {
        if (asset.asset_type) {
          // Find the corresponding token in our list
          const token = tokenList.find((token: Token) => {
            // Match by tokenAddress
            if (token.tokenAddress && asset.asset_type === token.tokenAddress) {
              return true;
            }
            // Match APT by special case
            if (asset.asset_type.includes("::aptos_coin::AptosCoin") && token.faAddress === "0xa") {
              return true;
            }
            // Match by faAddress in asset_type
            if (token.faAddress && asset.asset_type.includes(token.faAddress)) {
              return true;
            }
            return false;
          });
          
          if (token && token.faAddress) {
            addresses.add(token.faAddress);
          }
        }
      });
    }
    
    return Array.from(addresses);
  }, [coinBalances]);

  // Fetch token prices
  const { data: tokenPrices, isLoading: isLoadingPrices } = useTokenPrices({
    faAddresses,
    enabled: true,
  });

  // Helper function to get USD value for a token
  const getUSDValue = (faAddress: string, balance: string) => {
    if (!tokenPrices || !balance) return null;
    
    const priceData = tokenPrices.find(price => price.faAddress === faAddress);
    if (!priceData) return null;
    
    const usdPrice = parseFloat(priceData.usdPrice);
    const tokenBalance = parseFloat(balance);
    const usdValue = tokenBalance * usdPrice;
    
    return usdValue;
  };

  // Helper function to format value in selected currency
  const formatValue = (usdValue: number) => {
    if (selectedCurrency === "KES" && exchangeRate) {
      const kesValue = usdValue * exchangeRate;
      return `KSh ${kesValue.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${usdValue.toFixed(2)}`;
  };

  // Filter tokens based on search and tab, with owned tokens at the top
  const filteredTokens = useMemo(() => {
    let filtered = tokenList.filter((token: Token) => {
      // Exclude banned tokens
      if (token.panoraTags.includes("Banned")) {
        return false;
      }

      const matchesSearch =
        token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.faAddress.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTab =
        activeTab === "All" || token.panoraTags.includes(activeTab);

      return matchesSearch && matchesTab;
    });

    // Sort tokens: owned tokens first, then by symbol alphabetically
    filtered.sort((a, b) => {
      const aBalance = getUserBalance(a.faAddress);
      const bBalance = getUserBalance(b.faAddress);

      // If one has balance and other doesn't, prioritize the one with balance
      if (aBalance && !bBalance) return -1;
      if (!aBalance && bBalance) return 1;

      // If both have balance or both don't have balance, sort alphabetically by symbol
      return a.symbol.localeCompare(b.symbol);
    });

    return filtered;
  }, [searchQuery, activeTab, coinBalances]);

  // Copy to clipboard function
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log(`${type} copied to clipboard:`, text);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  // Generate explorer URL
  const getExplorerUrl = (faAddress: string) => {
    const networkName = getNetworkName();
    return `https://explorer.aptoslabs.com/fungible_asset/${faAddress}?network=${networkName}`;
  };

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* Search Bar */}
      <div className="">
        <div className="flex relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, symbol or address"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white/5 backdrop-blur-md border-white/20 placeholder:text-gray-400 w-full rounded-lg pl-10 pr-10 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all duration-200 shadow-lg"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap bg-white/5 backdrop-blur-md rounded-xl p-1">
            <TabsTrigger
              value="All"
              className="text-xs data-[state=active]:bg-primary data-[state=active]:text-black text-gray-400 hover:text-white rounded-xl"
            >
              All
            </TabsTrigger>
            {allTags.slice(0, 5).map((tag) => (
              <TabsTrigger
                key={tag}
                value={tag}
                className="text-xs data-[state=active]:bg-primary data-[state=active]:text-black text-gray-400 hover:text-white rounded-xl"
              >
                {tag}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <div className="space-y-3 max-h-[calc(100vh-20rem)] overflow-y-auto">
              {isLoadingCoinBalances ? (
                <div className="text-center py-8">
                  <div className="text-gray-400">Loading token balances...</div>
                </div>
              ) : filteredTokens.length > 0 ? (
                filteredTokens.map((token: Token) => {
                  const userBalance = getUserBalance(token.faAddress);

                  return (
                    <div
                      key={token.faAddress}
                      className={`bg-white/5 backdrop-blur-md rounded-lg p-4 ${
                        userBalance
                          ? "border-t-2 border-primary !bg-primary/10"
                          : ""
                      }`}
                    >
                      <div className="flex justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                            {token.logoUrl ? (
                              <Image
                                src={token.logoUrl}
                                alt={`${token.symbol} logo`}
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-full"
                                onError={(e) => {
                                  // Fallback to emoji if image fails to load
                                  e.currentTarget.style.display = "none";
                                  e.currentTarget.nextElementSibling?.classList.remove(
                                    "hidden"
                                  );
                                }}
                              />
                            ) : null}
                            <span
                              className={`text-lg ${
                                token.logoUrl ? "hidden" : ""
                              }`}
                            >
                              🔵
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="text-white font-semibold">
                              {token.symbol}
                            </div>
                            <div className="flex gap-3">
                              <div className="text-gray-400 text-sm truncate max-w-48">
                                {token.name}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  className="text-gray-400 hover:text-white transition-colors"
                                  onClick={() =>
                                    copyToClipboard(
                                      token.faAddress,
                                      "FA Address"
                                    )
                                  }
                                  title="Copy FA Address"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                                <a
                                  href={getExplorerUrl(token.faAddress)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-400 hover:text-white transition-colors"
                                  title="View on Explorer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {userBalance ? (
                            <>
                              <div className="text-white font-semibold">
                                {userBalance} 
                              </div>
                              {(() => {
                                const usdValue = getUSDValue(token.faAddress, userBalance);
                                return usdValue ? (
                                  <div className="text-green-400 text-sm">
                                    {formatValue(usdValue)}
                                  </div>
                                ) : isLoadingPrices ? (
                                  <div className="text-gray-400 text-sm">
                                    Loading price...
                                  </div>
                                ) : (
                                  <div className="text-gray-400 text-sm">
                                    Price unavailable
                                  </div>
                                );
                              })()}
                            </>
                          ) : (
                            <>
                              <div className="text-gray-400 text-sm">
                                0.00 
                              </div>
                              <div className="text-gray-500 text-xs">
                                {selectedCurrency === "KES" ? "KSh 0.00" : "$0.00"}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400">No tokens found</div>
                  <div className="text-gray-500 text-sm mt-1">
                    Try adjusting your search or filter
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
