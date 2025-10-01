import { useState, useCallback, useRef, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { addPaymentMethod, initiateOnramp, createPaymentStatusStream } from "../utils";

export type OnrampStatus = "idle" | "adding_payment_method" | "initiating_onramp" | "monitoring_payment" | "success" | "error";

export interface OnrampState {
  status: OnrampStatus;
  error: string | null;
  paymentMethodId: string | null;
  transactionCode: string | null;
  paymentStatus: any;
}

export function useOnramp() {
  const { account } = useWallet();
  const [state, setState] = useState<OnrampState>({
    status: "idle",
    error: null,
    paymentMethodId: null,
    transactionCode: null,
    paymentStatus: null,
  });
  
  const eventSourceRef = useRef<EventSource | null>(null);

  const reset = useCallback(() => {
    setState({
      status: "idle",
      error: null,
      paymentMethodId: null,
      transactionCode: null,
      paymentStatus: null,
    });
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const startOnramp = useCallback(async (params: {
    phoneNumber: string;
    mobileNetwork: string;
    amount: number;
  }) => {
    if (!account?.address) {
      setState(prev => ({ ...prev, status: "error", error: "Wallet not connected" }));
      return;
    }

    try {
      setState(prev => ({ ...prev, status: "adding_payment_method", error: null }));

      const providerId = params.mobileNetwork.toLowerCase() === "safaricom" ? "safaricom" : "airtel";
      
      const paymentMethodResponse = await addPaymentMethod({
        owner: account.address.toString(),
        payment_method_type: "mobile-money",
        identity: params.phoneNumber,
        provider_id: providerId,
      });

      setState(prev => ({
        ...prev,
        paymentMethodId: paymentMethodResponse.address,
        status: "initiating_onramp"
      }));

      const onrampResponse = await initiateOnramp({
        payment_method_id: paymentMethodResponse.address,
        amount: params.amount,
        target_token: "apt",
      });

      setState(prev => ({
        ...prev,
        transactionCode: onrampResponse.code,
        status: "monitoring_payment"
      }));

      const eventSource = createPaymentStatusStream(onrampResponse.code);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "payment_status") {
            setState(prev => ({ ...prev, paymentStatus: data }));
            
            if (data.status === "completed" || data.status === "success") {
              setState(prev => ({ ...prev, status: "success" }));
              eventSource.close();
            } else if (data.status === "failed" || data.status === "error") {
              setState(prev => ({ 
                ...prev, 
                status: "error", 
                error: data.message || "Payment failed" 
              }));
              eventSource.close();
            }
          } else if (data.type === "error") {
            setState(prev => ({ 
              ...prev, 
              status: "error", 
              error: data.message || "Payment monitoring error" 
            }));
            eventSource.close();
          }
        } catch (parseError) {
          console.error("Error parsing SSE data:", parseError);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE connection error:", error);
        setState(prev => ({ 
          ...prev, 
          status: "error", 
          error: "Connection error while monitoring payment" 
        }));
        eventSource.close();
      };

    } catch (error) {
      setState(prev => ({
        ...prev,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }));
    }
  }, [account?.address]);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    ...state,
    startOnramp,
    reset,
    isLoading: ["adding_payment_method", "initiating_onramp", "monitoring_payment"].includes(state.status),
  };
}