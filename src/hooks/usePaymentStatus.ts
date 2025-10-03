import React, { useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPaymentStatus } from '../utils';

interface PaymentStatusData {
  type: string;
  status: string;
  message?: string;
  transaction_id?: string;
  amount?: number;
  currency?: string;
  timestamp?: string;
}

interface UsePaymentStatusOptions {
  enabled?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: PaymentStatusData) => void;
  onError?: (error: Error) => void;
}

export function usePaymentStatus(
  transactionCode: string | null,
  options: UsePaymentStatusOptions = {}
) {
  const {
    enabled = true,
    refetchInterval = 2000, // Poll every 2 seconds as per API docs
    onSuccess,
    onError,
  } = options;
  
  // Use refs to prevent infinite loops
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  
  // Update refs when callbacks change
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  const queryResult = useQuery<PaymentStatusData, Error>({
    queryKey: ['paymentStatus', transactionCode],
    queryFn: () => {
      if (!transactionCode) {
        throw new Error('Transaction code is required');
      }
      return fetchPaymentStatus(transactionCode);
    },
    enabled: enabled && !!transactionCode,
    refetchInterval: (query) => {
      const data = query.state.data as PaymentStatusData | undefined;
      // Stop polling if payment is complete or failed (handle both uppercase and lowercase)
      if (data?.status === 'completed' || 
          data?.status === 'Completed' ||
          data?.status === 'success' || 
          data?.status === 'Success' ||
          data?.status === 'failed' || 
          data?.status === 'Failed' ||
          data?.status === 'error' ||
          data?.status === 'Error') {
        console.log('🏁 Stopping payment status polling - final status:', data?.status);
        return false;
      }
      
      // Continue polling for pending payments
      return refetchInterval;
    },
    refetchIntervalInBackground: false,
    staleTime: 0, // Always fetch fresh data
    retry: (failureCount: number, error: Error) => {
      console.log(`🔄 Payment status query failed (attempt ${failureCount + 1}):`, error);
      
      // Retry up to 3 times with exponential backoff
      if (failureCount < 3) {
        const delay = Math.pow(2, failureCount) * 1000;
        console.log(`⏳ Retrying in ${delay}ms...`);
        return true;
      }
      
      console.error('❌ Max retry attempts reached for payment status');
      return false;
    },
    retryDelay: (attemptIndex: number) => Math.pow(2, attemptIndex) * 1000,
  });

  // Handle success/error callbacks using useEffect with stable refs
  const prevDataRef = useRef<PaymentStatusData | undefined>();
  const prevErrorRef = useRef<Error | null>(null);
  
  React.useEffect(() => {
    if (queryResult.data && queryResult.isSuccess && queryResult.data !== prevDataRef.current) {
      console.log('✅ Payment status updated:', queryResult.data);
      onSuccessRef.current?.(queryResult.data);
      prevDataRef.current = queryResult.data;
    }
  }, [queryResult.data, queryResult.isSuccess]);

  React.useEffect(() => {
    if (queryResult.error && queryResult.isError && queryResult.error !== prevErrorRef.current) {
      console.error('❌ Payment status query error:', queryResult.error);
      onErrorRef.current?.(queryResult.error);
      prevErrorRef.current = queryResult.error;
    }
  }, [queryResult.error, queryResult.isError]);

  return queryResult;
}