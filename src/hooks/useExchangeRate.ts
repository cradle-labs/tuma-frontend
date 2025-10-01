import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

interface ExchangeRateApiResponse {
  code: number;
  message: string;
  data: {
    buying_rate: number;
    selling_rate: number;
    quoted_rate: number;
  };
}

interface ExchangeRateResponse {
  rate: number;
  currency_code: string;
  success: boolean;
}

async function fetchExchangeRate(currencyCode: string): Promise<ExchangeRateResponse> {
  const response = await fetch('/api/pretium/exchange-rate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      currency_code: currencyCode,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch exchange rate for ${currencyCode}: ${response.status}`);
  }

  const data = await response.json();

  console.log('Exchange rate data:', data);
  
  if (!data.data?.buying_rate) {
    throw new Error(`No buying rate found for ${currencyCode}`);
  }

  return {
    rate: data.data.buying_rate,
    currency_code: currencyCode,
    success: true,
  };
}

export function useExchangeRate(currencyCode: string) {
  const {
    data,
    isLoading,
    error,
    refetch,
    isError,
  } = useQuery({
    queryKey: ["exchangeRate", currencyCode],
    queryFn: () => fetchExchangeRate(currencyCode),
    enabled: !!currencyCode,
    staleTime: 10 * 60 * 1000, // 10 minutes - exchange rates don't change that frequently
    gcTime: 30 * 60 * 1000, // 30 minutes cache time
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnMount: false, // Don't refetch on component mount if data is still fresh
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  return useMemo(() => ({
    exchangeRate: data?.rate || null,
    isLoadingExchangeRate: isLoading,
    exchangeRateError: error,
    isUsingFallback: false,
    currencyCode: data?.currency_code,
    refetchExchangeRate: refetch,
    hasExchangeRateError: isError,
  }), [data?.rate, data?.currency_code, isLoading, error, isError, refetch]);
}