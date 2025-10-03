import { useQueries } from '@tanstack/react-query';
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { hyperionSDK } from '@/lib/hyperion';

interface Position {
  isActive: boolean;
  value: string;
  subsidy: {
    claimed: Array<{
      amount: string;
      amountUSD: string;
      token: string;
    }>;
    unclaimed: Array<{
      amount: string;
      amountUSD: string;
      token: string;
    }>;
  };
  fees: {
    claimed: Array<{
      amount: string;
      amountUSD: string;
      token: string;
    }>;
    unclaimed: Array<{
      amount: string;
      amountUSD: string;
      token: string;
    }>;
  };
  position: {
    objectId: string;
    poolId: string;
    tickLower: number;
    tickUpper: number;
    createdAt: string;
    pool: {
      currentTick: number;
      feeRate: string;
      feeTier: number;
      poolId: string;
      senderAddress: string;
      sqrtPrice: string;
      token1: string;
      token2: string;
      token1Info: {
        assetType: string;
        bridge: any;
        coinMarketcapId: string;
        coinType: string;
        coingeckoId: string;
        decimals: number;
        faType: string;
        hyperfluidSymbol: string;
        logoUrl: string;
        name: string;
        symbol: string;
        isBanned: boolean;
        websiteUrl: string;
      };
      token2Info: {
        assetType: string;
        bridge: any;
        coinMarketcapId: string;
        coinType: string;
        coingeckoId: string;
        decimals: number;
        faType: string;
        hyperfluidSymbol: string;
        logoUrl: string;
        name: string;
        symbol: string;
        isBanned: boolean;
        websiteUrl: string;
      };
    };
  };
}

interface UseHyperionPositionsReturn {
  positions: Position[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const fetchPositionsByAddress = async (address: string): Promise<Position[]> => {
  const positions = await hyperionSDK.Position.fetchAllPositionsByAddress({
    address: address
  });
  return positions;
};

export function useHyperionPositions(): UseHyperionPositionsReturn {
  const { account, connected } = useWallet();

  const results = useQueries({
    queries: connected && account?.address ? [{
      queryKey: ['hyperion-positions', account.address.toString()],
      queryFn: () => fetchPositionsByAddress(account.address.toString()),
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: 3,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      enabled: connected && !!account?.address
    }] : [{
      queryKey: ['hyperion-positions', 'disabled'],
      queryFn: () => Promise.resolve([]),
      enabled: false
    }]
  });
  
  const { data: positions = [], isLoading, error, refetch } = results[0] || { data: [], isLoading: false, error: null, refetch: () => {} };

  return {
    positions,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch: () => refetch()
  };
}