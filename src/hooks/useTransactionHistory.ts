"use client";

import { useQuery } from "@tanstack/react-query";

export interface TransactionData {
  id: string;
  requester: string;
  payment_method_id: string;
  status: "Completed" | "Failed" | "Pending";
  transaction_ref: string;
  data: {
    receipt: string;
  } | null;
  amount: string;
  requested_at: string;
  finalized_at: string | null;
  target_token: string;
  final_token_quote: string;
  on_chain_transaction_hash: string | null;
}

export type TransactionType = "onramp" | "offramp" | "payment";

interface UseTransactionHistoryProps {
  address: string;
  type: TransactionType;
  enabled?: boolean;
}

export function useTransactionHistory({ address, type, enabled = true }: UseTransactionHistoryProps) {
  return useQuery({
    queryKey: ["transactions", address, type],
    queryFn: async (): Promise<TransactionData[]> => {
      if (!address) return [];
      
      const response = await fetch(
        `https://preview-api.tooma.xyz/transactions/${type}/${address}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${type} transactions`);
      }
      
      return response.json();
    },
    enabled: enabled && !!address,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useAllTransactionHistory(address: string, enabled = true) {
  const onrampQuery = useTransactionHistory({ address, type: "onramp", enabled });
  const offrampQuery = useTransactionHistory({ address, type: "offramp", enabled });
  const paymentQuery = useTransactionHistory({ address, type: "payment", enabled });

  return {
    onramp: onrampQuery,
    offramp: offrampQuery,
    payment: paymentQuery,
    isLoading: onrampQuery.isLoading || offrampQuery.isLoading || paymentQuery.isLoading,
    isError: onrampQuery.isError || offrampQuery.isError || paymentQuery.isError,
    refetch: () => {
      onrampQuery.refetch();
      offrampQuery.refetch();
      paymentQuery.refetch();
    }
  };
}
