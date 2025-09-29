import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { NetworkInfo } from "@aptos-labs/wallet-adapter-core";

export const aptosClient = (network?: NetworkInfo | null) => {
  if (network?.name === Network.DEVNET) {
    return DEVNET_CLIENT;
  } else if (network?.name === Network.TESTNET) {
    return TESTNET_CLIENT;
  } else if (network?.name === Network.MAINNET) {
    throw new Error("Please use devnet or testnet for testing");
  } else {
    const CUSTOM_CONFIG = new AptosConfig({
      network: Network.CUSTOM,
      fullnode: network?.url,
    });
    return new Aptos(CUSTOM_CONFIG);
  }
};

// Devnet client
export const DEVNET_CONFIG = new AptosConfig({
  network: Network.DEVNET,
});
export const DEVNET_CLIENT = new Aptos(DEVNET_CONFIG);

// Testnet client
export const TESTNET_CONFIG = new AptosConfig({ network: Network.TESTNET });
export const TESTNET_CLIENT = new Aptos(TESTNET_CONFIG);

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

export const getUserCoinBalances = async (
  accountAddress: string,
  network?: NetworkInfo | null,
) => {
  // Determine GraphQL endpoint based on network
  let graphqlUrl = "https://api.mainnet.aptoslabs.com/v1/graphql";
  if (network?.name === Network.TESTNET) {
    graphqlUrl = "https://api.testnet.aptoslabs.com/v1/graphql";
  } else if (network?.name === Network.DEVNET) {
    graphqlUrl = "https://api.devnet.aptoslabs.com/v1/graphql";
  }

  const query = `
    query GetFungibleAssetBalances($owner_address: String!) {
      current_fungible_asset_balances(
        where: { owner_address: { _eq: $owner_address } }
      ) {
        amount
        asset_type
        is_frozen
        is_primary
        last_transaction_timestamp
        last_transaction_version
        owner_address
        storage_id
        token_standard
        metadata {
          token_standard
          symbol
          name
          decimals
          creator_address
          asset_type
          icon_uri
          project_uri
        }
      }
    }
  `;

  try {
    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          owner_address: accountAddress,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data.current_fungible_asset_balances;
  } catch (error) {
    console.error("Error fetching user fungible asset balances via GraphQL:", error);
    throw error;
  }
};
