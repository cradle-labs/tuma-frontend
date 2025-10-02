import { useState, useCallback } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { addPaymentMethod, initiateOnramp } from "../utils";
import { usePaymentStatus } from "./usePaymentStatus";

export type OnrampStatus = "idle" | "adding_payment_method" | "initiating_onramp" | "monitoring_payment" | "success" | "error";

export interface OnrampState {
  status: OnrampStatus;
  error: string | null;
  paymentMethodId: string | null;
  transactionCode: string | null;
}

export function useOnramp() {
  const { account } = useWallet();
  const [state, setState] = useState<OnrampState>({
    status: "idle",
    error: null,
    paymentMethodId: null,
    transactionCode: null,
  });
  
  // Use React Query for payment status polling
  const { 
    data: paymentStatus, 
    error: paymentError, 
    isLoading: isPollingStatus 
  } = usePaymentStatus(
    state.transactionCode,
    {
      enabled: state.status === "monitoring_payment",
      onSuccess: (data) => {
        console.log("💳 Payment status update from React Query:", data);
        
        if (data.status === "completed" || data.status === "success") {
          console.log("✅ Payment completed successfully via polling");
          setState(prev => ({ ...prev, status: "success" }));
        } else if (data.status === "failed" || data.status === "error") {
          console.log("❌ Payment failed via polling:", data.message);
          setState(prev => ({ 
            ...prev, 
            status: "error", 
            error: data.message || "Payment failed" 
          }));
        }
      },
      onError: (error) => {
        console.error("❌ Payment status polling error:", error);
        setState(prev => ({ 
          ...prev, 
          status: "error", 
          error: "Failed to monitor payment status" 
        }));
      }
    }
  );

  const reset = useCallback(() => {
    setState({
      status: "idle",
      error: null,
      paymentMethodId: null,
      transactionCode: null,
    });
  }, []);

  const startOnramp = useCallback(async (params: {
    phoneNumber: string;
    mobileNetwork: string;
    amount: number;
    existingPaymentMethodId?: string | null;
  }) => {
    console.log("🚀 Starting onramp process with params:", params);
    
    if (!account?.address) {
      console.error("❌ Wallet not connected");
      setState(prev => ({ ...prev, status: "error", error: "Wallet not connected" }));
      return;
    }

    console.log("💼 Wallet address:", account.address.toString());

    try {
      let paymentMethodId: string;

      if (params.existingPaymentMethodId) {
        console.log("💳 Using existing payment method:", params.existingPaymentMethodId);
        paymentMethodId = params.existingPaymentMethodId;
        setState(prev => ({
          ...prev,
          paymentMethodId: paymentMethodId,
          status: "initiating_onramp",
          error: null
        }));
      } else {
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
        paymentMethodId = paymentMethodResponse.address;
        setState(prev => ({
          ...prev,
          paymentMethodId: paymentMethodId,
          status: "initiating_onramp"
        }));
      }

      console.log("🚀 Step 2: Initiating onramp...");
      const onrampResponse = await initiateOnramp({
        payment_method_id: paymentMethodId,
        amount: params.amount,
        target_token: "apt",
      });

      console.log("✅ Onramp initiated successfully:", onrampResponse);
      console.log("🔄 Step 3: Starting payment monitoring with React Query polling...");
      setState(prev => ({
        ...prev,
        transactionCode: onrampResponse.code,
        status: "monitoring_payment"
      }));
      
      // React Query will automatically start polling when transactionCode is set
      // and status is "monitoring_payment"

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

  return {
    ...state,
    paymentStatus,
    startOnramp,
    reset,
    isLoading: ["adding_payment_method", "initiating_onramp", "monitoring_payment"].includes(state.status),
  };
}