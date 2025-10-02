"use client";

import { useUserTokens } from "../hooks/useUserTokens";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

export function UserTokensDisplay() {
  const { connected } = useWallet();
  const {
    tokens,
    coinBalances,
    isLoading,
    error,
    refetch,
  } = useUserTokens();

  if (!connected) {
    return <div>Please connect your wallet to view tokens</div>;
  }

  if (isLoading) {
    return <div>Loading tokens...</div>;
  }

  if (error) {
    return (
      <div>
        <p>Error loading tokens: {(error as Error).message}</p>
        <button onClick={refetch}>Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Coin Balances</h3>
        {coinBalances && coinBalances.length > 0 ? (
          <ul className="space-y-2">
            {coinBalances.map((coin, index) => (
              <li key={index} className="p-2 border rounded">
                <div>Type: {coin.asset_type}</div>
                <div>Amount: {coin.amount}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No coin balances found</p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Owned Tokens</h3>
        {tokens && tokens.length > 0 ? (
          <ul className="space-y-2">
            {tokens.map((token, index) => (
              <li key={index} className="p-2 border rounded">
                <div>Token: {token.current_token_data?.token_name || 'Unknown'}</div>
                <div>Collection: {token.token_data_id || 'Unknown'}</div>
                <div>Amount: {token.amount}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No tokens found</p>
        )}
      </div>

      <button
        onClick={refetch}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Refresh Tokens
      </button>
    </div>
  );
}