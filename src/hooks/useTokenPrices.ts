import { useQueries } from "@tanstack/react-query";

interface TokenPrice {
  chainId: number;
  tokenAddress: string | null;
  faAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  usdPrice: string;
  priceChange24H: string;
  nativePrice: string;
}

interface UseTokenPricesProps {
  faAddresses: string[];
  enabled?: boolean;
}

export function useTokenPrices({ faAddresses, enabled = true }: UseTokenPricesProps) {
  // Use useQueries for parallel fetching of individual token prices
  // This is more efficient than fetching all prices in a single request
  const queries = useQueries({
    queries: faAddresses.map((faAddress) => ({
      queryKey: ["tokenPrice", faAddress],
      queryFn: async (): Promise<TokenPrice | null> => {
        try {
          const end_point = "https://api.panora.exchange/prices";
          const headers = {
            "x-api-key": "a4^KV_EaTf4MW#ZdvgGKX#HUD^3IFEAOV_kzpIE^3BQGA8pDnrkT7JcIy#HNlLGi",
          };

          const query = { tokenAddress: faAddress };
          const queryString = new URLSearchParams(query);
          const url = `${end_point}?${queryString}`;

          const response = await fetch(url, {
            method: "GET",
            headers: headers,
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch price for ${faAddress}: ${response.status}`);
          }

          const data = await response.json();
          return Array.isArray(data) ? data[0] : data;
        } catch (error) {
          console.error(`Error fetching price for ${faAddress}:`, error);
          return null;
        }
      },
      enabled: enabled && faAddresses.length > 0,
      staleTime: 30000, // 30 seconds
      refetchInterval: 60000, // Refetch every minute
      retry: 2, // Retry failed requests twice
      retryDelay: 1000, // Wait 1 second between retries
    })),
  });

  // Transform the results to match the expected format
  const data = queries
    .map((query) => query.data)
    .filter((price): price is TokenPrice => price !== null && price !== undefined);

  const isLoading = queries.some((query) => query.isLoading);
  const isError = queries.some((query) => query.isError);
  const error = queries.find((query) => query.error)?.error;

  return {
    data,
    isLoading,
    isError,
    error,
  };
}

// Hook to get price for a single token
export function useTokenPrice(faAddress: string, enabled: boolean = true) {
  return useTokenPrices({ faAddresses: [faAddress], enabled });
}
