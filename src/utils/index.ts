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

export const addPaymentMethod = async (params: {
  owner: string;
  payment_method_type: string;
  identity: string;
  provider_id: string;
}) => {
  try {
    const response = await fetch("https://preview-api.tooma.xyz/payment-method", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Payment method creation failed: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error adding payment method:", error);
    throw error;
  }
};

export const initiateOnramp = async (params: {
  payment_method_id: string;
  amount: number;
  target_token: string;
}) => {
  try {
    const response = await fetch("https://preview-api.tooma.xyz/on-ramp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Onramp initiation failed: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error initiating onramp:", error);
    throw error;
  }
};

export const createPaymentStatusStream = (code: string) => {
  return new EventSource(`https://preview-api.tooma.xyz/status/${code}`);
};


export const depositFungibleToContract = async (
  signAndSubmitTransaction: any,
  amount: string,
  metadataAddress: string
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

    // Use the standard wallet adapter format with string address
    const transactionPayload = {
      data: {
        function: "0xce349ffbde2e28c21a4a7de7c4e1b3d72f1fe079494c7f8f8832bd6c8502e559::tuma::deposit_fungible",
        typeArguments: [
          "0x1::fungible_asset::Metadata"
        ],
        functionArguments: [
          "0xa", // Simple string address instead of { inner: "0xa" }
          amount
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

