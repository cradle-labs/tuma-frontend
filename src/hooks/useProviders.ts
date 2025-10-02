import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface Provider {
  id: string;
  name: string;
  description: string;
  provider_type: string;
  supported_currency: {
    currency_type: string;
    name: string;
    symbol: string;
    id: string;
    country: string;
    description: string;
    chain: string | null;
    address: string | null;
    is_fungible_asset: boolean | null;
    decimals: number | null;
  };
}

export interface UseProvidersResult {
  providers: Provider[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  getProvidersByCountry: (countryCode: string) => Provider[];
  getCountries: () => Array<{ code: string; name: string; currency: string; flag: string }>;
  refetch: () => void;
}

const fetchProviders = async (): Promise<Provider[]> => {
  const response = await fetch('https://preview-api.tooma.xyz/providers');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch providers: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
};

export function useProviders(): UseProvidersResult {
  const {
    data: providers = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['providers'],
    queryFn: fetchProviders,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const getProvidersByCountry = useMemo(() => {
    return (countryCode: string): Provider[] => {
      return providers.filter(provider => 
        provider.supported_currency.id.toLowerCase() === countryCode.toLowerCase()
      );
    };
  }, [providers]);

  const getCountries = useMemo(() => {
    return (): Array<{ code: string; name: string; currency: string; flag: string }> => {
      const uniqueCountries = new Map();
      
      providers.forEach(provider => {
        const currency = provider.supported_currency;
        const countryCode = currency.id.toUpperCase();
        
        if (!uniqueCountries.has(countryCode)) {
          // Map country codes to flags
          const flagMap: Record<string, string> = {
            'KES': '🇰🇪',
            'UGX': '🇺🇬', 
            'GHS': '🇬🇭',
            'CDF': '🇨🇩',
            'ETB': '🇪🇹',
            'RWF': '🇷🇼',
            'TZS': '🇹🇿',
            'ZAR': '🇿🇦',
            'NGN': '🇳🇬',
           
          };
          
          uniqueCountries.set(countryCode, {
            code: countryCode,
            name: currency.country,
            currency: currency.symbol,
            flag: flagMap[countryCode] || '🏳️'
          });
        }
      });
      
      return Array.from(uniqueCountries.values());
    };
  }, [providers]);

  return {
    providers,
    isLoading,
    isError,
    error,
    getProvidersByCountry,
    getCountries,
    refetch
  };
}
