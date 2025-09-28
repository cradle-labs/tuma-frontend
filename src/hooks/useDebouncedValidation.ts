import { useEffect, useRef } from 'react';
import { useValidatePhoneNumber } from './useValidatePhoneNumber';

interface UseDebouncedValidationProps {
  phoneNumber: string;
  paymentType: 'MOBILE' | 'PAYBILL' | 'BUY_GOODS';
  mobileNetwork: string;
  enabled?: boolean;
  debounceMs?: number;
}

export function useDebouncedValidation({
  phoneNumber,
  paymentType,
  mobileNetwork,
  enabled = true,
  debounceMs = 800, // Increased from 500ms to reduce API calls
}: UseDebouncedValidationProps) {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastValidatedParamsRef = useRef<string>('');
  
  const validation = useValidatePhoneNumber();
  
  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Create a unique key for the current validation parameters
    const currentParams = `${phoneNumber}-${paymentType}-${mobileNetwork}`;
    
    // Don't validate if:
    // - Not enabled
    // - Phone number is too short
    // - Already validating
    // - Same parameters were already validated successfully
    if (
      !enabled ||
      !phoneNumber ||
      phoneNumber.length < 10 ||
      validation.isPending ||
      (lastValidatedParamsRef.current === currentParams && validation.isSuccess)
    ) {
      return;
    }
    
    // Set up debounced validation
    timeoutRef.current = setTimeout(() => {
      validation.mutate({
        type: paymentType,
        shortcode: phoneNumber,
        mobile_network: mobileNetwork,
      });
      lastValidatedParamsRef.current = currentParams;
    }, debounceMs);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [phoneNumber, paymentType, mobileNetwork, enabled, debounceMs, validation]);
  
  // Reset validation state when phone number becomes too short
  useEffect(() => {
    if (phoneNumber.length < 10) {
      lastValidatedParamsRef.current = '';
    }
  }, [phoneNumber]);
  
  return {
    ...validation,
    isValidating: validation.isPending,
    validationResult: validation.data,
    clearValidation: () => {
      validation.reset();
      lastValidatedParamsRef.current = '';
    },
  };
}