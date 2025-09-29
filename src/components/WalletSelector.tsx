"use client";

import {
  APTOS_CONNECT_ACCOUNT_URL,
  AboutAptosConnect,
  AboutAptosConnectEducationScreen,
  AdapterNotDetectedWallet,
  AdapterWallet,
  AptosPrivacyPolicy,
  WalletItem,
  WalletSortingOptions,
  groupAndSortWallets,
  isAptosConnectWallet,
  isInstallRequired,
  truncateAddress,
  useWallet,
} from "@aptos-labs/wallet-adapter-react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Copy,
  LogOut,
  User,
  Eye,
  Search,
  Smile,
  X,
  ArrowUpDown,
  ExternalLink,
  Power,
  Loader2,
} from "lucide-react";
import { useCallback, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useToast } from "./ui/use-toast";

export function WalletSelector(walletSortingOptions: WalletSortingOptions) {
  const { account, connected, disconnect, wallet } = useWallet();
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const closeSheet = useCallback(() => setIsSheetOpen(false), []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isSheetOpen) {
        closeSheet();
      }
    };

    if (isSheetOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSheetOpen, closeSheet]);

  const copyAddress = useCallback(async () => {
    if (!account?.address) return;
    try {
      await navigator.clipboard.writeText(account.address.toString());
      toast({
        title: "Success",
        description: "Copied wallet address to clipboard.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy wallet address.",
      });
    }
  }, [account?.address, toast]);

  return connected ? (
    <>
      <Button 
        variant="primary" 
        onClick={() => setIsSheetOpen(true)}
      >
        {account?.ansName ||
          truncateAddress(account?.address?.toString()) ||
          "Unknown"}
      </Button>
      {isSheetOpen && createPortal(
        <div className="fixed inset-0 z-[100] pointer-events-none">
          <div className="fixed inset-y-0 right-0 w-3/4 sm:max-w-md bg-[#0A0A0A] border-l border-gray-700 flex flex-col h-full pointer-events-auto shadow-lg animate-in slide-in-from-right duration-500">
            <WalletHoldingsSheet close={closeSheet} account={account} />
          </div>
        </div>,
        document.body
      )}
    </>
  ) : (
    <>
      <Button variant="primary" onClick={() => setIsSheetOpen(true)}>Connect a Wallet</Button>
      {isSheetOpen && createPortal(
        <div className="fixed inset-0 z-[100] pointer-events-none">
          <div className="fixed inset-y-0 right-0 w-3/4 sm:max-w-md bg-[#0A0A0A] border-l border-gray-700 flex flex-col h-full pointer-events-auto shadow-lg animate-in slide-in-from-right duration-500">
            <ConnectWalletSheet close={closeSheet} {...walletSortingOptions} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

interface ConnectWalletSheetProps extends WalletSortingOptions {
  close: () => void;
}

function ConnectWalletSheet({
  close,
  ...walletSortingOptions
}: ConnectWalletSheetProps) {
  const { wallets = [], notDetectedWallets = [], isLoading } = useWallet();

  const { aptosConnectWallets, availableWallets, installableWallets } =
    groupAndSortWallets(
      [...wallets, ...notDetectedWallets],
      walletSortingOptions,
    );

  const hasAptosConnectWallets = !!aptosConnectWallets.length;

  return (
    <div className="w-full h-full flex flex-col">
      <AboutAptosConnect renderEducationScreen={renderEducationScreen}>
        <div className="pb-6 flex-shrink-0 px-6 pt-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-white text-xl font-semibold">
              Login or Connect
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </h2>
            <button 
              onClick={close}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Esc
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-white text-lg font-medium">Connecting wallet...</div>
              <div className="text-gray-400 text-sm">Please wait while we establish the connection</div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-thin px-6">
            {hasAptosConnectWallets && (
              <div className="flex flex-col gap-2 pt-3">
                {aptosConnectWallets.map((wallet) => (
                  <AptosConnectWalletRow
                    key={wallet.name}
                    wallet={wallet}
                    onConnect={close}
                  />
                ))}
                <div className="flex items-center gap-3 pt-4 text-gray-400">
                  <div className="h-px w-full bg-gray-700" />
                  <span className="text-sm">or</span>
                  <div className="h-px w-full bg-gray-700" />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-3">
              <h3 className="text-white text-lg font-medium mb-2">Web3 Wallets</h3>
              {availableWallets.map((wallet) => (
                <WalletRow key={wallet.name} wallet={wallet} onConnect={close} />
              ))}
              {!!installableWallets.length && (
                <Collapsible className="flex flex-col gap-3">
                  <CollapsibleTrigger asChild>
                    <Button size="sm" variant="ghost" className="gap-2">
                      More wallets <ChevronDown />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="flex flex-col gap-3">
                    {installableWallets.map((wallet) => (
                      <WalletRow
                        key={wallet.name}
                        wallet={wallet}
                        onConnect={close}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </div>
        )}
      </AboutAptosConnect>
    </div>
  );
}

interface WalletHoldingsSheetProps {
  close: () => void;
  account: any;
}

function WalletHoldingsSheet({ close, account }: WalletHoldingsSheetProps) {
  const { disconnect } = useWallet();
  
  const handleDisconnect = () => {
    disconnect();
    close();
  };

  // Mock data for holdings - in a real app, this would come from an API
  const holdings = [
    {
      symbol: "USDT",
      name: "Tether USD",
      icon: "🟢", // In real app, this would be an actual icon
      balance: "6.240776",
      usdValue: "~$6.24",
      change: "-<0.01%",
      changePositive: false,
    },
    {
      symbol: "lzUSDC",
      name: "LayerZero • USD Coi...",
      icon: "🔵",
      balance: "3.953216",
      usdValue: "~$3.95",
      change: "-0.66%",
      changePositive: false,
    },
    {
      symbol: "APT",
      name: "Aptos Coin",
      icon: "⚫",
      balance: "0.08637134",
      usdValue: "~$0.37",
      change: "+0.67%",
      changePositive: true,
    },
  ];

  const totalBalance = "$10.56";

  return (
    <div className="w-full h-full flex flex-col bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="text-white font-semibold">Chizaa.apt</span>
        </div>
        <div className="flex items-center  gap-4">
          <button 
            onClick={handleDisconnect}
            className="text-red-500 hover:text-red-400 transition-colors"
            title="Disconnect wallet"
          >
            <Power className="h-5 w-5" />
          </button>
          <button 
            onClick={close}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Esc
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4">
        {/* Total Balance */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Balance</span>
            <button className="text-gray-400 hover:text-white transition-colors">
              <Eye className="h-4 w-4" />
            </button>
          </div>
          <div className="text-3xl font-bold text-white">{totalBalance}</div>
        </div>

        {/* Balance Categories */}
        <div className="mb-6">
          <div className="bg-green-600/20 border border-green-600/30 rounded-lg p-3">
            <div className="text-green-400 text-xs mb-1">Holdings (3)</div>
            <div className="text-white font-semibold">{totalBalance}</div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, symbol or address"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-12 pr-10 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-gray-600"
          />
          <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tokens Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">Tokens</span>
            <ArrowUpDown className="h-4 w-4 text-gray-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Balances (USD)</span>
            <ArrowUpDown className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Token Holdings */}
        {/* TODO: render popular apt tokens */}
        <div className="space-y-3">
          {holdings.map((token, index) => (
            <div key={index} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-lg">{token.icon}</span>
                  </div>
                  <div>
                    <div className="text-white font-semibold">{token.symbol}</div>
                    <div className="text-gray-400 text-sm">{token.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="text-gray-400 hover:text-white transition-colors">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button className="text-gray-400 hover:text-white transition-colors">
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">{token.balance}</div>
                  <div className="text-gray-400 text-sm">{token.usdValue}</div>
                </div>
                <div className={`text-sm font-medium ${
                  token.changePositive ? 'text-green-400' : 'text-red-400'
                }`}>
                  {token.change}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View on Explorer Button */}
        <div className="mt-6">
          <Button variant="primary" className="w-full">
            View on Explorer
          </Button>
        </div>
      </div>
    </div>
  );
}

interface WalletRowProps {
  wallet: AdapterWallet | AdapterNotDetectedWallet;
  onConnect?: () => void;
}

function WalletRow({ wallet, onConnect }: WalletRowProps) {
  const isInstalled = !isInstallRequired(wallet);
  const { isLoading } = useWallet();
  
  return (
    <WalletItem
      wallet={wallet}
      onConnect={onConnect}
      className="flex items-center justify-between px-4 py-4 gap-4 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
    >
      <div className="flex items-center gap-4">
        <WalletItem.Icon className="h-6 w-6" />
        <div className="flex flex-col">
          <WalletItem.Name className="text-base font-normal text-white" />
          <span className="text-sm text-gray-400">
            {isInstalled ? "Detected" : "Not Installed"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        
        {isInstallRequired(wallet) ? (
          <Button size="sm" variant="outline" className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600" asChild>
            <WalletItem.InstallLink />
          </Button>
        ) : (
          <WalletItem.ConnectButton asChild>
            <Button size="sm" variant="primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </WalletItem.ConnectButton>
        )}
      </div>
    </WalletItem>
  );
}

function AptosConnectWalletRow({ wallet, onConnect }: WalletRowProps) {
  const { isLoading } = useWallet();
  
  return (
    <WalletItem wallet={wallet} onConnect={onConnect}>
      <WalletItem.ConnectButton asChild>
        <Button 
          size="lg" 
          variant="outline" 
          className="w-full gap-4 bg-gray-800 border-gray-700 hover:bg-gray-700 text-white h-14 px-4 justify-start"
          disabled={isLoading}
          >
          <WalletItem.Icon className="h-6 w-6" />
          <div className="flex items-center justify-between w-full">
            <WalletItem.Name className="text-base font-normal" />
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
          </div>
        </Button>
      </WalletItem.ConnectButton>
    </WalletItem>
  );
}

function renderEducationScreen(screen: AboutAptosConnectEducationScreen) {
  return (
    <>
      <div className="grid grid-cols-[1fr_4fr_1fr] items-center space-y-0 px-6 pt-6">
        <Button variant="ghost" size="icon" onClick={screen.cancel}>
          <ArrowLeft />
        </Button>
        <h2 className="leading-snug text-base text-center text-white">
          About Aptos Connect
        </h2>
      </div>

      <div className="flex h-[162px] pb-3 items-end justify-center">
        <screen.Graphic />
      </div>
      <div className="flex flex-col gap-2 text-center pb-4">
        <screen.Title className="text-xl" />
        <screen.Description className="text-sm text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a]:text-foreground" />
      </div>

      <div className="grid grid-cols-3 items-center">
        <Button
          size="sm"
          variant="ghost"
          onClick={screen.back}
          className="justify-self-start"
        >
          Back
        </Button>
        <div className="flex items-center gap-2 place-self-center">
          {screen.screenIndicators.map((ScreenIndicator, i) => (
            <ScreenIndicator key={i} className="py-4">
              <div className="h-0.5 w-6 transition-colors bg-muted [[data-active]>&]:bg-foreground" />
            </ScreenIndicator>
          ))}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={screen.next}
          className="gap-2 justify-self-end"
        >
          {screen.screenIndex === screen.totalScreens - 1 ? "Finish" : "Next"}
          <ArrowRight size={16} />
        </Button>
      </div>
    </>
  );
}
