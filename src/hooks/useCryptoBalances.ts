import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useSupportedCurrencies } from "./useSupportedCurrencies";
import { aptosClient } from "../utils";
import { useMemo } from "react";

export interface CryptoBalance {
  currency: {
    id: string;
    symbol: string;
    name: string;
    address: string | null;
    decimals: number | null;
  };
  balance: {
    amount: string; // Raw amount from blockchain
    formatted: string; // Human-readable amount
  };
}

export interface UseCryptoBalancesReturn {
  cryptoBalances: CryptoBalance[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  // Helper functions
  getBalanceBySymbol: (symbol: string) => CryptoBalance | undefined;
  getBalanceById: (currencyId: string) => CryptoBalance | undefined;
  hasSufficientBalance: (currencyId: string, requiredAmount: number) => boolean;
}

/**
 * Hook that fetches user balances for cryptocurrencies directly from the Aptos blockchain
 * using the Aptos SDK, similar to useUserTokens.ts
 */
export const useCryptoBalances = (): UseCryptoBalancesReturn => {
  const { account, network } = useWallet();
  const { 
    cryptoCurrencies, 
    isLoading: isLoadingCurrencies, 
    isError: isCurrenciesError, 
    error: currenciesError,
    refetch: refetchCurrencies
  } = useSupportedCurrencies();

  console.log('cryptoCurrencies', cryptoCurrencies);

  // Fetch all fungible asset balances (including APT) using the same method as useUserTokens
  const {
    data: allFungibleAssetBalances,
    isLoading: isLoadingBalances,
    error: balancesError,
    refetch: refetchBalances,
  } = useQuery({
    queryKey: ["cryptoBalances", account?.address, network?.name],
    queryFn: async () => {
      if (!account?.address) return [];
      
      const client = aptosClient(network);
      
      // Use the same successful approach as useUserTokens.ts
      const balances = await client.getCurrentFungibleAssetBalances({
        options: {
          where: {
            owner_address: { _eq: account.address.toString() },
          },
        },
      });
      
      console.log('All fungible asset balances:', balances);
      return balances;
    },
    enabled: !!account?.address,
    staleTime: 30000, // 30 seconds
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Format asset amount from raw blockchain value to human-readable format
  const formatAssetAmount = (amount: string, decimals: number): string => {
    return (parseFloat(amount) / Math.pow(10, decimals)).toFixed(6);
  };

  // Combine cryptocurrencies with blockchain balances using the same matching logic as existing code
  const cryptoBalances = useMemo((): CryptoBalance[] => {
    if (!cryptoCurrencies.length || !allFungibleAssetBalances) return [];

    return cryptoCurrencies.map(currency => {
      // console.log(`\n--- Processing currency: ${currency.symbol} ---`);
      // console.log('Currency data:', {
      //   id: currency.id,
      //   symbol: currency.symbol,
      //   address: currency.address
      // });

      // Find matching blockchain balance using the same logic as successful components
      const matchingBalance = allFungibleAssetBalances.find(asset => {
        if (!asset.asset_type || !currency.address) return false;

        // Primary match: exact match with currency address
        if (asset.asset_type === currency.address) {
          // console.log(`✅ Exact match found for ${currency.symbol}`);
          return true;
        }

        // Special case for APT: check for aptos_coin pattern
        if (currency.symbol === "APT" && asset.asset_type.includes("::aptos_coin::AptosCoin")) {
          // console.log(`✅ APT pattern match found for ${currency.symbol}`);
          return true;
        }

        // Special case for Gui Inu: use the specific address provided
        if (currency.name === "Gui Inu" && asset.asset_type === "0xe4ccb6d39136469f376242c31b34d10515c8eaaa38092f804db8e08a8f53c5b2::assets_v1::EchoCoin002") {
          // console.log(`✅ Gui Inu special address match found for ${currency.symbol}`);
          return true;
        }
        return false;
      });

      const rawAmount = matchingBalance?.amount || "0";
      const decimals = currency.decimals || 8;

      console.log(`Final result for ${currency.symbol}:`, {
        rawAmount,
        formattedAmount: formatAssetAmount(rawAmount, decimals),
        matchFound: !!matchingBalance
      });

      return {
        currency: {
          id: currency.id,
          symbol: currency.symbol,
          name: currency.name,
          address: currency.address,
          decimals: currency.decimals
        },
        balance: {
          amount: rawAmount,
          formatted: formatAssetAmount(rawAmount, decimals)
        }
      };
    });
  }, [cryptoCurrencies, allFungibleAssetBalances]);

  // Helper function to get balance by symbol
  const getBalanceBySymbol = (symbol: string): CryptoBalance | undefined => {
    return cryptoBalances.find(balance => balance.currency.symbol === symbol);
  };

  // Helper function to get balance by currency ID
  const getBalanceById = (currencyId: string): CryptoBalance | undefined => {
    return cryptoBalances.find(balance => balance.currency.id === currencyId);
  };

  // Helper function to check if user has sufficient balance
  const hasSufficientBalance = (currencyId: string, requiredAmount: number): boolean => {
    const balance = getBalanceById(currencyId);
    if (!balance) return false;
    
    const availableAmount = parseFloat(balance.balance.formatted);
    return availableAmount >= requiredAmount;
  };

  // Combined refetch function
  const refetch = () => {
    refetchCurrencies();
    refetchBalances();
  };

  return {
    cryptoBalances,
    isLoading: isLoadingCurrencies || isLoadingBalances,
    isError: isCurrenciesError || !!balancesError,
    error: currenciesError || balancesError,
    refetch,
    getBalanceBySymbol,
    getBalanceById,
    hasSufficientBalance
  };
};