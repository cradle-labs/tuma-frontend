import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export interface SupportedCurrency {
  currency_type: "Fiat" | "Crypto";
  name: string;
  symbol: string;
  id: string;
  country: string | null;
  description: string;
  chain: string | null;
  address: string | null;
  is_fungible_asset: boolean | null;
  decimals: number | null;
}

async function fetchSupportedCurrencies(): Promise<SupportedCurrency[]> {
  console.log('=== fetchSupportedCurrencies: Starting API call ===');
  const response = await fetch('https://preview-api.tooma.xyz/currencies');

  if (!response.ok) {
    throw new Error(`Failed to fetch supported currencies: ${response.status}`);
  }

  const data = await response.json();
  
  
  // Filter and log USDC/USDT entries
  const usdcUsdtCurrencies = data.filter((currency: SupportedCurrency) => 
    currency.symbol === 'USDC' || currency.symbol === 'USDT' || currency.symbol === 'USDt'
  );
  
  return data;
}

export function useSupportedCurrencies() {
  const {
    data,
    isLoading,
    error,
    refetch,
    isError,
  } = useQuery({
    queryKey: ["supportedCurrencies"],
    queryFn: fetchSupportedCurrencies,
    staleTime: 60 * 60 * 1000, // 1 hour - currencies don't change frequently
    gcTime: 2 * 60 * 60 * 1000, // 2 hours cache time
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const cryptoCurrencies = useMemo(() => {
    if (!data) return [];
    
    // Filter for crypto currencies and remove duplicates based on id
    const cryptoOnly = data.filter(currency => currency.currency_type === "Crypto");
    
    // Remove duplicates by creating a Map with id as key
    const uniqueCrypto = new Map();
    cryptoOnly.forEach(currency => {
      if (!uniqueCrypto.has(currency.id)) {
        uniqueCrypto.set(currency.id, currency);
      }
    });
    
    return Array.from(uniqueCrypto.values());
  }, [data]);


  const fiatCurrencies = useMemo(() => {
    if (!data) return [];
    
    // Filter for fiat currencies and remove duplicates based on id
    const fiatOnly = data.filter(currency => currency.currency_type === "Fiat");
    
    // Remove duplicates by creating a Map with id as key
    const uniqueFiat = new Map();
    fiatOnly.forEach(currency => {
      if (!uniqueFiat.has(currency.id)) {
        uniqueFiat.set(currency.id, currency);
      }
    });
    
    return Array.from(uniqueFiat.values());
  }, [data]);

  // Create a mapping from token addresses to supported currencies for easy lookup
  const supportedTokensMap = useMemo(() => {
    
    
    const map = new Map<string, SupportedCurrency>();
    cryptoCurrencies.forEach(currency => {
      if (currency.address) {
        const key = currency.address.toLowerCase();
        map.set(key, currency);
        console.log(`Added to supportedTokensMap: ${key} -> ${currency.symbol} (${currency.name})`);
      } else {
        console.log(`Skipped currency with no address: ${currency.symbol} (${currency.name})`);
      }
    });
    
  
    
    return map;
  }, [cryptoCurrencies]);

  // Helper function to check if a token is supported
  const isTokenSupported = useMemo(() => {
    return (faAddress: string) => {
      const key = faAddress.toLowerCase();
      const isSupported = supportedTokensMap.has(key);
    
      return isSupported;
    };
  }, [supportedTokensMap]);

  return {
    allCurrencies: data || [],
    cryptoCurrencies,
    fiatCurrencies,
    supportedTokensMap,
    isTokenSupported,
    isLoading,
    error,
    refetch,
    isError,
  };
}