import { useMemo } from "react";
import { useUserTokens } from "./useUserTokens";
import { useTokenPrices } from "./useTokenPrices";
import tokenList from "../utils/token-list.json";

interface UserAsset {
  amount: string;
  asset_type: string;
  metadata: {
    name: string;
    symbol: string;
    decimals: number;
    icon_uri?: string;
  };
  usdValue?: number;
}

export function useUserAssets() {
  const { coinBalances, isLoadingCoinBalances, coinBalancesError } = useUserTokens();

  const userAssets = useMemo(() => {
    if (!coinBalances || !Array.isArray(coinBalances)) return [];

    return coinBalances
      .filter((asset: any) => parseFloat(asset.amount.toString()) > 0)
      .map((asset: any) => {
        // Find metadata from token list
        const tokenInfo = tokenList.find((token: any) => 
          token.tokenAddress === asset.asset_type || 
          (asset.asset_type.includes("::aptos_coin::AptosCoin") && token.faAddress === "0xa")
        );
        
        return {
          ...asset,
          amount: asset.amount.toString(),
          metadata: tokenInfo ? {
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
            decimals: tokenInfo.decimals,
            icon_uri: tokenInfo.logoUrl || undefined,
          } : {
            name: "Unknown Token",
            symbol: "UNKNOWN",
            decimals: 8,
          },
        };
      })
      .filter((asset: UserAsset) => asset.metadata.symbol !== "UNKNOWN") as UserAsset[];

  }, [coinBalances]);

  // Helper function to find token info safely
  const findTokenInfo = (assetType: string) => {
    return tokenList.find((token: any) => {
      // Match by exact tokenAddress
      if (token.tokenAddress && assetType === token.tokenAddress) {
        return true;
      }
      // Match APT by special case
      if (assetType.includes("::aptos_coin::AptosCoin") && token.faAddress === "0xa") {
        return true;
      }
      // Match by faAddress in asset_type (fallback)
      if (token.faAddress && assetType.includes(token.faAddress)) {
        return true;
      }
      return false;
    });
  };

  // Get faAddresses for price fetching
  const faAddresses = useMemo(() => {
    return userAssets.map(asset => {
      const tokenInfo = findTokenInfo(asset.asset_type);
      return tokenInfo?.faAddress;
    }).filter((faAddress): faAddress is string => Boolean(faAddress));
  }, [userAssets]);

  // Fetch prices for user assets
  const { data: tokenPrices } = useTokenPrices({
    faAddresses,
    enabled: userAssets.length > 0,
  });

  // Add USD values to assets
  const assetsWithUSD = useMemo(() => {
    return userAssets.map(asset => {
      const tokenInfo = findTokenInfo(asset.asset_type);
      
      // Return asset without USD value if no token info or no prices
      if (!tokenInfo || !tokenPrices || !tokenInfo.faAddress) {
        console.log('No token info or faAddress for asset:', {
          assetType: asset.asset_type,
          tokenInfo: tokenInfo ? { faAddress: tokenInfo.faAddress } : null,
          hasPrices: !!tokenPrices
        });
        return asset;
      }
      
      const priceData = tokenPrices.find(price => price && price.faAddress === tokenInfo.faAddress);
      if (!priceData) {
        console.log('No price data found for:', tokenInfo.faAddress);
        return asset;
      }
      
      const usdPrice = parseFloat(priceData.usdPrice);
      const tokenBalance = parseFloat(asset.amount) / Math.pow(10, asset.metadata.decimals);
      const usdValue = tokenBalance * usdPrice;
      
      return {
        ...asset,
        usdValue,
      };
    });
  }, [userAssets, tokenPrices]);

  return {
    userAssets: assetsWithUSD,
    isLoadingAssets: isLoadingCoinBalances,
    assetsError: coinBalancesError,
  };
}
