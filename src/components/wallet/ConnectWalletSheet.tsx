"use client";

import {
  AboutAptosConnect,
  AboutAptosConnectEducationScreen,
  WalletSortingOptions,
  groupAndSortWallets,
  useWallet,
} from "@aptos-labs/wallet-adapter-react";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { AptosConnectWalletRow } from "./AptosConnectWalletRow";
import { WalletRow } from "./WalletRow";
import { EducationScreen } from "./EducationScreen";

interface ConnectWalletSheetProps extends WalletSortingOptions {
  close: () => void;
}

export function ConnectWalletSheet({
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
      <AboutAptosConnect renderEducationScreen={EducationScreen}>
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
