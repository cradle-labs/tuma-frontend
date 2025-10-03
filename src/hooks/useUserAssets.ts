import { useMemo } from "react";
import { useUserTokens } from "./useUserTokens";
import { useTokenPrices } from "./useTokenPrices";
import { useSupportedCurrencies } from "./useSupportedCurrencies";
import tokenList from "../utils/token-list.json";

interface UserAsset {
  amount: string;
  asset_type: string;
  fa_address: string; // The fungible asset address to use in smart contract calls
  currency_id?: string; // The currency ID from supported currencies for conversion APIs
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
  const { supportedTokensMap } = useSupportedCurrencies();

  const userAssets = useMemo(() => {
    if (!coinBalances || !Array.isArray(coinBalances)) {
      console.log('=== useUserAssets: No coin balances available ===');
      return [];
    }

    console.log('=== useUserAssets: Processing coin balances ===');
    console.log('Raw coinBalances:', coinBalances);
    console.log('supportedTokensMap size:', supportedTokensMap.size);
    console.log('supportedTokensMap entries:', Array.from(supportedTokensMap.entries()));

    return coinBalances
      .filter((asset: any) => parseFloat(asset.amount.toString()) > 0)
      .map((asset: any) => {
        console.log(`\n--- Processing asset: ${asset.asset_type} ---`);
        console.log('Asset data:', asset);
        
        // Special debugging for USDC/USDT
        const isUSDCOrUSDT = asset.asset_type.toLowerCase().includes('usdc') || asset.asset_type.toLowerCase().includes('usdt');
        if (isUSDCOrUSDT) {
          console.log('*** SPECIAL DEBUG: USDC/USDT asset detected ***');
          console.log('Asset type contains USDC/USDT:', asset.asset_type);
        }
        
        // Find metadata from token list
        const tokenInfo = tokenList.find((token: any) => 
          token.tokenAddress === asset.asset_type || 
          (asset.asset_type.includes("::aptos_coin::AptosCoin") && token.faAddress === "0xa")
        );
        
        console.log('Found tokenInfo:', tokenInfo ? {
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          faAddress: tokenInfo.faAddress,
          tokenAddress: tokenInfo.tokenAddress
        } : null);
        
        // Get currency ID from supported currencies based on faAddress
        const faAddress = tokenInfo?.faAddress || asset.asset_type;
        console.log('Using faAddress for lookup:', faAddress);
        console.log('Looking up in supportedTokensMap with key:', faAddress.toLowerCase());
        
        const supportedCurrency = supportedTokensMap.get(faAddress.toLowerCase());
        console.log('Found supportedCurrency:', supportedCurrency ? {
          id: supportedCurrency.id,
          symbol: supportedCurrency.symbol,
          address: supportedCurrency.address
        } : null);
        
        const processedAsset = {
          ...asset,
          amount: asset.amount.toString(),
          fa_address: faAddress, // Use faAddress from token list, fallback to asset_type
          currency_id: supportedCurrency?.id, // Use currency ID from supported currencies for conversion APIs
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
        
        console.log('Processed asset result:', {
          symbol: processedAsset.metadata.symbol,
          fa_address: processedAsset.fa_address,
          currency_id: processedAsset.currency_id,
          amount: processedAsset.amount
        });
        
        // Extra logging for USDC/USDT
        if (processedAsset.metadata.symbol === 'USDC' || processedAsset.metadata.symbol === 'USDT' || processedAsset.metadata.symbol === 'USDt') {
          console.log('*** FINAL USDC/USDT RESULT ***', {
            originalAssetType: asset.asset_type,
            finalSymbol: processedAsset.metadata.symbol,
            finalFaAddress: processedAsset.fa_address,
            finalCurrencyId: processedAsset.currency_id,
            tokenInfoFound: !!tokenInfo,
            supportedCurrencyFound: !!supportedCurrency
          });
        }
        
        return processedAsset;
      })
      .filter((asset: UserAsset) => {
        const isKnownAsset = asset.metadata.symbol !== "UNKNOWN";
        console.log(`Asset ${asset.metadata.symbol} - isKnownAsset: ${isKnownAsset}`);
        return isKnownAsset;
      }) as UserAsset[];

  }, [coinBalances, supportedTokensMap]);

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
