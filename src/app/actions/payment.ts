'use server';

import { 
  Aptos, 
  AptosConfig, 
  Network, 
  Account,
  Ed25519PrivateKey,
  Serializer
} from "@aptos-labs/ts-sdk";

interface PaymentTransactionParams {
  address: string;
  metadataAddress: string;
  amount: string;
  paymentSessionId: string;
}

interface SerializedTransactionResponse {
  transaction: string;
  authenticator: string;
}

// Initialize Aptos client (adjust network as needed)
const aptosConfig = new AptosConfig({ 
  network: Network.TESTNET // Change to your target network
});
const aptos = new Aptos(aptosConfig);

// Admin account setup - You'll need to set these environment variables
const getAdminAccount = (): Account => {
  const privateKeyHex = process.env.SPONSOR_PRIVATE_KEY;
  if (!privateKeyHex) {
    throw new Error("SPONSOR_PRIVATE_KEY environment variable is required");
  }
  
  const privateKey = new Ed25519PrivateKey(privateKeyHex);
  return Account.fromPrivateKey({ privateKey });
};

export async function getPaymentTransactionSerialized(
  params: PaymentTransactionParams
): Promise<SerializedTransactionResponse> {
  try {
    console.log("Creating gas-sponsored payment transaction:", params);

    const admin = getAdminAccount();
    
    // Build multi-agent transaction with sponsor as secondary signer
    const transaction = await aptos.transaction.build.multiAgent({
      sender: params.address,
      secondarySignerAddresses: [admin.accountAddress],
      data: {
        function: "0xce349ffbde2e28c21a4a7de7c4e1b3d72f1fe079494c7f8f8832bd6c8502e559::tuma::make_payment_fungible",
        typeArguments: [
          "0x1::fungible_asset::Metadata"
        ],
        functionArguments: [
          params.metadataAddress,
          params.amount,
          params.paymentSessionId
        ]
      }
    });

    // Sign transaction with admin account (sponsor)
    const authenticator = aptos.sign({
      transaction,
      signer: admin
    });

    // Serialize transaction and authenticator
    const transaction_serializer = new Serializer();
    transaction.serialize(transaction_serializer);

    const authenticator_serializer = new Serializer();
    authenticator.serialize(authenticator_serializer);

    // Convert to base64 strings
    const transaction_stringified = Buffer.from(transaction_serializer.toUint8Array()).toString("base64");
    const authenticator_stringified = Buffer.from(authenticator_serializer.toUint8Array()).toString("base64");

    console.log("Successfully created serialized transaction");

    return {
      transaction: transaction_stringified,
      authenticator: authenticator_stringified
    };
  } catch (error) {
    console.error("Error creating gas-sponsored transaction:", error);
    throw new Error(`Failed to create gas-sponsored transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}