import { useState, useCallback, useRef, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { addPaymentMethod, initiateOnramp, createPaymentStatusStream, testPaymentStatusEndpoint } from "../utils";

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
    console.log("🚀 Starting onramp process with params:", params);
    
    if (!account?.address) {
      console.error("❌ Wallet not connected");
      setState(prev => ({ ...prev, status: "error", error: "Wallet not connected" }));
      return;
    }

    console.log("💼 Wallet address:", account.address.toString());

    try {
      console.log("💳 Step 1: Adding payment method...");
      setState(prev => ({ ...prev, status: "adding_payment_method", error: null }));

      const providerId = params.mobileNetwork.toLowerCase() === "safaricom" ? "safaricom" : "airtel";
      console.log("🏦 Provider ID selected:", providerId);
      
      const paymentMethodResponse = await addPaymentMethod({
        owner: account.address.toString(),
        payment_method_type: "mobile-money",
        identity: params.phoneNumber,
        provider_id: providerId,
      });

      console.log("✅ Payment method created successfully:", paymentMethodResponse);
      setState(prev => ({
        ...prev,
        paymentMethodId: paymentMethodResponse.address,
        status: "initiating_onramp"
      }));

      console.log("🚀 Step 2: Initiating onramp...");
      const onrampResponse = await initiateOnramp({
        payment_method_id: paymentMethodResponse.address,
        amount: params.amount,
        target_token: "apt",
      });

      console.log("✅ Onramp initiated successfully:", onrampResponse);

      console.log("🔄 Step 3: Starting payment monitoring...");
      setState(prev => ({
        ...prev,
        transactionCode: onrampResponse.code,
        status: "monitoring_payment"
      }));

      // Test the endpoint first
      console.log("🧪 Testing SSE endpoint before creating EventSource...");
      const endpointTest = await testPaymentStatusEndpoint(onrampResponse.code);
      console.log("📊 SSE endpoint test result:", endpointTest);
      
      if (!endpointTest.exists) {
        console.error("❌ SSE endpoint does not exist or is not accessible");
        setState(prev => ({ 
          ...prev, 
          status: "error", 
          error: `Payment monitoring endpoint not found (${endpointTest.status || 'unknown'}). Code: ${onrampResponse.code}` 
        }));
        return;
      }

      const eventSource = createPaymentStatusStream(onrampResponse.code);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        console.log("📥 SSE message received:", {
          data: event.data,
          type: event.type,
          lastEventId: event.lastEventId
        });
        
        try {
          const data = JSON.parse(event.data);
          console.log("📝 Parsed SSE data:", data);
          
          if (data.type === "payment_status") {
            console.log("💳 Payment status update:", data);
            setState(prev => ({ ...prev, paymentStatus: data }));
            
            if (data.status === "completed" || data.status === "success") {
              console.log("✅ Payment completed successfully");
              setState(prev => ({ ...prev, status: "success" }));
              eventSource.close();
            } else if (data.status === "failed" || data.status === "error") {
              console.log("❌ Payment failed:", data.message);
              setState(prev => ({ 
                ...prev, 
                status: "error", 
                error: data.message || "Payment failed" 
              }));
              eventSource.close();
            }
          } else if (data.type === "error") {
            console.log("❌ SSE error message:", data.message);
            setState(prev => ({ 
              ...prev, 
              status: "error", 
              error: data.message || "Payment monitoring error" 
            }));
            eventSource.close();
          }
        } catch (parseError) {
          console.error("❌ Error parsing SSE data:", {
            parseError,
            rawData: event.data
          });
        }
      };

      eventSource.onerror = (error) => {
        console.error("❌ SSE connection error:", {
          error,
          readyState: eventSource.readyState,
          url: eventSource.url,
          transactionCode: onrampResponse.code
        });
        
        // Check if it's a 404 error specifically
        if (eventSource.readyState === EventSource.CLOSED) {
          console.error("❌ EventSource closed - likely a 404 or server error");
        }
        
        setState(prev => ({ 
          ...prev, 
          status: "error", 
          error: "Connection error while monitoring payment - check console for details" 
        }));
        eventSource.close();
      };

    } catch (error) {
      console.error("❌ Onramp process failed:", {
        error,
        message: error instanceof Error ? error.message : "Unknown error occurred",
        stack: error instanceof Error ? error.stack : undefined
      });
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