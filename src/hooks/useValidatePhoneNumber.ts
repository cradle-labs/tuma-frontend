import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ValidationRequest {
  type: 'MOBILE' | 'PAYBILL' | 'BUY_GOODS';
  shortcode: string;
  mobile_network: string; // Support all mobile networks from different countries
  currency_code?: string;
}

interface ValidationResponse {
  data: {
    public_name?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

async function validatePhoneNumber(request: ValidationRequest): Promise<ValidationResponse> {
  const response = await fetch('/api/pretium/validation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || 'Validation failed');
  }
  
  return result;
}

export function useValidatePhoneNumber() {
  return useMutation({
    mutationFn: validatePhoneNumber,
    onSuccess: () => {
      toast.success('Mobile number validated successfully');
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to validate mobile number';
      toast.error(errorMessage);
    },
  });
}