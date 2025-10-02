import { useQuery } from '@tanstack/react-query';
import { getConversionRate } from '@/app/actions/conversion';

interface ConversionResponse {
  converted: number;
  from_usd_quote: number;
  to_usd_quote: number;
}

interface ConversionParams {
  from: string;
  to: string;
  amount: number;
}

export function useConversion(params: ConversionParams | null) {
  return useQuery({
    queryKey: ['conversion', params?.from, params?.to, params?.amount],
    queryFn: () => getConversionRate(params!),
    enabled: !!(params && params.amount > 0),
    staleTime: 1000 * 60, // 1 minute
    retry: 2,
  });
}
