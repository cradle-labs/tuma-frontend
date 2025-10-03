import { Network } from "@aptos-labs/ts-sdk";
import { initHyperionSDK } from '@hyperionxyz/sdk';

const APTOS_API_KEY = process.env.APTOS_API_KEY!;
// Initialize Hyperion SDK
export const hyperionSDK = initHyperionSDK({
    network: Network.MAINNET,
    APTOS_API_KEY: APTOS_API_KEY
});

// Pool IDs to fetch
export const POOL_IDS = [
    '0xd3894aca06d5f42b27c89e6f448114b3ed6a1ba07f992a58b2126c71dd83c127', // usdc-usdt
    '0x925660b8618394809f89f8002e2926600c775221f43bf1919782b297a79400d8', // apt-usdc
    '0x879dc427508a866d404503e423d3beb66aab5617e9bc26915b38e6ec14f0c2dc', // apt-gui
    '0xff5a013a4676f724714aec0082403fad822972c56348ba08e0405d08e533325e', // xBtc-usdc
    '0x6df8340de848eb3a43eaef4b090d365c8e88e79b3044f11964c9de7b213914e9', // apt-wbtc
    '0xd8609fb7a2446b1e343de45decc9651d4402b967439d352849a422b55327516f', // apt-xbtc
    '0x18269b1090d668fbbc01902fa6a5ac6e75565d61860ddae636ac89741c883cbc'  // apt-usdt
];

export const POOL_NAMES: { [key: string]: string } = {
    '0xd3894aca06d5f42b27c89e6f448114b3ed6a1ba07f992a58b2126c71dd83c127': 'USDC-USDT',
    '0x925660b8618394809f89f8002e2926600c775221f43bf1919782b297a79400d8': 'APT-USDC',
    '0x879dc427508a866d404503e423d3beb66aab5617e9bc26915b38e6ec14f0c2dc': 'APT-GUI',
    '0xff5a013a4676f724714aec0082403fad822972c56348ba08e0405d08e533325e': 'xBTC-USDC',
    '0x6df8340de848eb3a43eaef4b090d365c8e88e79b3044f11964c9de7b213914e9': 'APT-WBTC',
    '0xd8609fb7a2446b1e343de45decc9651d4402b967439d352849a422b55327516f': 'APT-xBTC',
    '0x18269b1090d668fbbc01902fa6a5ac6e75565d61860ddae636ac89741c883cbc': 'APT-USDT'
};