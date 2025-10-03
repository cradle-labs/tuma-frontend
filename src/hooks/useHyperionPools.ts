import { useQueries } from '@tanstack/react-query';
import { hyperionSDK, POOL_IDS, POOL_NAMES } from '@/lib/hyperion';

interface Pool {
    id: string;
    name: string;
    data: any; // Will be typed based on actual SDK response
    isLoading: boolean;
    error?: string;
}

interface UseHyperionPoolsReturn {
    pools: Pool[];
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

const fetchPoolById = async (poolId: string) => {
    const poolData = await hyperionSDK.Pool.fetchPoolById({
        poolId: poolId
    });
    return poolData;
};

export function useHyperionPools(): UseHyperionPoolsReturn {
    const poolQueries = useQueries({
        queries: POOL_IDS.map((poolId) => ({
            queryKey: ['hyperion-pool', poolId],
            queryFn: () => fetchPoolById(poolId),
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
            retry: 3,
            retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
        }))
    });

    // Transform the query results into Pool objects
    const pools: Pool[] = poolQueries.map((query, index) => {
        const poolId = POOL_IDS[index];
        return {
            id: poolId,
            name: POOL_NAMES[poolId] || 'Unknown Pool',
            data: query.data,
            isLoading: query.isLoading,
            error: query.error instanceof Error ? query.error.message : undefined
        };
    });

    // Global loading state - true if any pool is still loading
    const isLoading = poolQueries.some(query => query.isLoading);

    // Global error state - collect all errors
    const errors = poolQueries
        .filter(query => query.error)
        .map(query => query.error instanceof Error ? query.error.message : 'Unknown error');
    
    const globalError = errors.length > 0 ? `Failed to load ${errors.length} pool(s)` : null;

    // Refetch function to refetch all pools
    const refetch = () => {
        poolQueries.forEach(query => query.refetch());
    };

    return {
        pools,
        isLoading,
        error: globalError,
        refetch
    };
}