import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { getUserTokens, aptosClient } from "../utils";

export function useUserTokens() {
  const { account, network } = useWallet();

  const {
    data: tokens,
    isLoading: isLoadingTokens,
    error: tokensError,
    refetch: refetchTokens,
  } = useQuery({
    queryKey: ["userTokens", account?.address, network?.name],
    queryFn: () => getUserTokens(account!.address.toString(), network),
    enabled: !!account?.address,
    staleTime: 30000, // 30 seconds
  });

  const {
    data: coinBalances,
    isLoading: isLoadingCoinBalances,
    error: coinBalancesError,
    refetch: refetchCoinBalances,
  } = useQuery({
    queryKey: ["userCoinBalances", account?.address, network?.name],
    queryFn: async () => {
      if (!account?.address) return [];
      const client = aptosClient(network);
      const balances = await client.getCurrentFungibleAssetBalances({
        options: {
          where: {
            owner_address: { _eq: account.address.toString() },
          },
        },
      });
      return balances;
    },
    enabled: !!account?.address,
    staleTime: 30000, // 30 seconds
  });

  return {
    tokens,
    coinBalances,
    isLoading: isLoadingTokens || isLoadingCoinBalances,
    isLoadingTokens,
    isLoadingCoinBalances,
    error: tokensError || coinBalancesError,
    tokensError,
    coinBalancesError,
    refetchTokens,
    refetchCoinBalances,
    refetch: () => {
      refetchTokens();
      refetchCoinBalances();
    },
  };
}