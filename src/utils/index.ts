import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { NetworkInfo } from "@aptos-labs/wallet-adapter-core";

// Devnet client
export const DEVNET_CONFIG = new AptosConfig({
  network: Network.DEVNET,
});
export const DEVNET_CLIENT = new Aptos(DEVNET_CONFIG);

// Testnet client
export const TESTNET_CONFIG = new AptosConfig({ network: Network.TESTNET });
export const TESTNET_CLIENT = new Aptos(TESTNET_CONFIG);

// Mainnet client
export const MAINNET_CONFIG = new AptosConfig({ network: Network.MAINNET });
export const MAINNET_CLIENT = new Aptos(MAINNET_CONFIG);

export const aptosClient = (network?: NetworkInfo | null) => {
  if (network?.name === Network.DEVNET) {
    return DEVNET_CLIENT;
  } else if (network?.name === Network.TESTNET) {
    return TESTNET_CLIENT;
  } else if (network?.name === Network.MAINNET) {
    return MAINNET_CLIENT;
  } else {
    const CUSTOM_CONFIG = new AptosConfig({
      network: Network.CUSTOM,
      fullnode: network?.url,
    });
    return new Aptos(CUSTOM_CONFIG);
  }
};

export const isSendableNetwork = (
  connected: boolean,
  networkName?: string,
): boolean => {
  return connected && !isMainnet(connected, networkName);
};

export const isMainnet = (
  connected: boolean,
  networkName?: string,
): boolean => {
  return connected && networkName === Network.MAINNET;
};

export const getUserTokens = async (
  accountAddress: string,
  network?: NetworkInfo | null,
) => {
  const client = aptosClient(network);
  
  try {
    const tokens = await client.getAccountOwnedTokens({
      accountAddress,
    });
    return tokens;
  } catch (error) {
    console.error("Error fetching user tokens:", error);
    throw error;
  }
};


export const createUserAccount = async (address: string) => {
  try {
    const response = await fetch("https://preview-api.tooma.xyz/account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return { success: true, data: result };
    } else if (response.status === 500) {
      return { success: false, error: "Account already exists" };
    } else {
      throw new Error(`Account creation failed: ${response.status}`);
    }
  } catch (error) {
    console.error("Error creating user account:", error);
    throw error;
  }
};

export const createPaymentSession = async (params: {
  payer: string;
  provider: string;
  receiver_id: string;
  token: string;
}) => {
  try {
    console.log("📤 createPaymentSession request:", {
      url: "https://preview-api.tooma.xyz/create-payment-session",
      method: "POST",
      params
    });

    const response = await fetch("https://preview-api.tooma.xyz/create-payment-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    console.log("📥 createPaymentSession response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ createPaymentSession error response:", errorText);
      throw new Error(`Payment session creation failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ createPaymentSession success response:", result);
    return result;
  } catch (error) {
    console.error("❌ Error creating payment session:", error);
    throw error;
  }
};

export const getPaymentStatus = async (paymentCode: string) => {
  try {
    console.log("📤 getPaymentStatus request:", {
      url: `https://preview-api.tooma.xyz/transaction/payment/${paymentCode}`,
      method: "GET"
    });

    const response = await fetch(`https://preview-api.tooma.xyz/transaction/payment/${paymentCode}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("📥 getPaymentStatus response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ getPaymentStatus error response:", errorText);
      throw new Error(`Payment status check failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ getPaymentStatus success response:", result);
    return result;
  } catch (error) {
    console.error("❌ Error checking payment status:", error);
    throw error;
  }
};

export const addPaymentMethod = async (params: {
  owner: string;
  payment_method_type: string;
  identity: string;
  provider_id: string;
}) => {
  try {
    console.log("📤 addPaymentMethod request:", {
      url: "https://preview-api.tooma.xyz/payment-method",
      method: "POST",
      params
    });

    const response = await fetch("https://preview-api.tooma.xyz/payment-method", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    console.log("📥 addPaymentMethod response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ addPaymentMethod error response:", errorText);
      throw new Error(`Payment method creation failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ addPaymentMethod success response:", result);
    return result;
  } catch (error) {
    console.error("❌ Error adding payment method:", error);
    throw error;
  }
};

export const initiateOnramp = async (params: {
  payment_method_id: string;
  amount: number;
  target_token: string;
}) => {
  try {
    console.log("📤 initiateOnramp request:", {
      url: "https://preview-api.tooma.xyz/on-ramp",
      method: "POST",
      params
    });

    const response = await fetch("https://preview-api.tooma.xyz/on-ramp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    console.log("📥 initiateOnramp response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ initiateOnramp error response:", errorText);
      throw new Error(`Onramp initiation failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ initiateOnramp success response:", result);
    return result;
  } catch (error) {
    console.error("❌ Error initiating onramp:", error);
    throw error;
  }
};

// Helper function to test if SSE endpoint exists
export const testPaymentStatusEndpoint = async (code: string) => {
  const url = `https://preview-api.tooma.xyz/status/onramp/${code}`;
  console.log("🧪 Testing payment status endpoint:", url);
  
  try {
    const response = await fetch(url, {
      method: 'HEAD', // Just check if endpoint exists
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });
    
    const responseHeaders = Object.fromEntries(response.headers.entries());
    console.log("📥 Payment status endpoint test response:", {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      contentType: response.headers.get('content-type')
    });
    
    return {
      exists: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    };
  } catch (error) {
    console.error("❌ Payment status endpoint test failed:", error);
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Parse SSE format data from the API response
const parseSSEData = (sseText: string): any => {
  console.log("📝 Raw SSE text:", sseText);
  
  const lines = sseText.trim().split('\n');
  let eventType = '';
  let data = '';
  
  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventType = line.substring(6).trim();
    } else if (line.startsWith('data:')) {
      data = line.substring(5).trim();
    }
  }
  
  console.log("📝 Parsed SSE:", { eventType, data });
  
  // Try to parse the data as JSON
  try {
    const parsedData = JSON.parse(data);
    return {
      type: eventType,
      ...parsedData
    };
  } catch (error) {
    console.error("❌ Failed to parse SSE data as JSON:", error);
    return {
      type: eventType,
      raw_data: data,
      status: 'unknown'
    };
  }
};

// Fetch payment status for React Query polling
export const fetchPaymentStatus = async (code: string) => {
  const url = `https://preview-api.tooma.xyz/status/onramp/${code}`;
  console.log("📡 Fetching payment status:", { code, url });
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log("📥 Payment status response:", {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type')
    });
    
    if (!response.ok) {
      throw new Error(`Payment status fetch failed: ${response.status} - ${response.statusText}`);
    }
    
    const responseText = await response.text();
    console.log("📜 Raw response text:", responseText);
    
    // Check if response looks like SSE format
    if (responseText.includes('event:') || responseText.includes('data:')) {
      const result = parseSSEData(responseText);
      console.log("✅ Parsed payment status data:", result);
      return result;
    } else {
      // Try to parse as regular JSON
      try {
        const result = JSON.parse(responseText);
        console.log("✅ JSON payment status data:", result);
        return result;
      } catch (jsonError) {
        console.error("❌ Failed to parse response as JSON:", jsonError);
        throw new Error(`Invalid response format: ${responseText.substring(0, 100)}...`);
      }
    }
  } catch (error) {
    console.error("❌ Error fetching payment status:", error);
    throw error;
  }
};

// Keep SSE as backup option
export const createPaymentStatusStream = (code: string) => {
  const url = `https://preview-api.tooma.xyz/status/onramp/${code}`;
  console.log("🔄 Creating EventSource for payment status:", { code, url });
  return new EventSource(url);
};


export const depositFungibleToContract = async (
  signAndSubmitTransaction: any,
  amount: string,
  metadataAddress: string,
  paymentSession: any
) => {
  try {
    if (!signAndSubmitTransaction) {
      throw new Error("signAndSubmitTransaction is not available");
    }

    // Validate inputs
    if (!metadataAddress) {
      throw new Error("metadataAddress is required");
    }

    // Log the raw input first
    console.log('Raw inputs:', {
      metadataAddress,
      amount,
      metadataAddressLength: metadataAddress.length,
      metadataAddressType: typeof metadataAddress,
      amountType: typeof amount,
      amountLength: amount.length
    });

    // Validate amount is a valid string number
    if (isNaN(Number(amount))) {
      throw new Error(`Invalid amount: ${amount}`);
    }

    // Generate random text for unique transaction identification
    const generateRandomText = () => {
      const timestamp = Date.now().toString(36);
      const randomString = Math.random().toString(36).substring(2, 15);
      return `tx-${timestamp}-${randomString}`;
    };

    // Use the standard wallet adapter format with string address
    const transactionPayload = {
      data: {
        function: "0xce349ffbde2e28c21a4a7de7c4e1b3d72f1fe079494c7f8f8832bd6c8502e559::tuma::make_payment_fungible",
        typeArguments: [
          "0x1::fungible_asset::Metadata"
        ],
        functionArguments: [
          "0xa", // Simple string address instead of { inner: "0xa" }
          amount,
          paymentSession?.session_id || paymentSession?.id || "default_session_id" // Payment session ID as third argument
        ]
      }
    };

    console.log('Contract call payload:', transactionPayload);
    
    const response = await signAndSubmitTransaction(transactionPayload);
    return response;
  } catch (error) {
    console.error("Error depositing to contract:", error);
    throw error;
  }
};

