"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { addPaymentMethod, depositFungibleToContract, getUserCoinBalances } from "@/utils/index";
import { useToast } from "@/components/ui/use-toast";
import { useExchangeRate } from "@/hooks/useExchangeRate";

// Country configuration
const COUNTRIES = {
  KES: { name: "Kenya", currency: "KES", symbol: "KES", flag: "🇰🇪" },
  UGX: { name: "Uganda", currency: "UGX", symbol: "UGX", flag: "🇺🇬" },
  GHS: { name: "Ghana", currency: "GHS", symbol: "GHS", flag: "🇬🇭" },
  CDF: { name: "DR Congo", currency: "CDF", symbol: "CDF", flag: "🇨🇩" },
  ETB: { name: "Ethiopia", currency: "ETB", symbol: "ETB", flag: "🇪🇹" },
} as const;

// Mobile networks by country
const MOBILE_NETWORKS = {
  KES: ["Safaricom", "Airtel"],
  UGX: ["MTN", "Airtel"],
  GHS: ["MTN", "AirtelTigo"],
  CDF: ["Airtel Money", "Orange Money"],
  ETB: ["Telebirr", "Cbe Birr"],
} as const;

interface PayFormProps {
  phoneNumber: string;
  setPhoneNumber: (phoneNumber: string) => void;
  accountNumber: string;
  setAccountNumber: (accountNumber: string) => void;
  paymentType: "MOBILE" | "PAYBILL" | "BUY_GOODS";
  setPaymentType: (type: "MOBILE" | "PAYBILL" | "BUY_GOODS") => void;
  mobileNetwork: string;
  setMobileNetwork: (network: string) => void;
  selectedCountry: "KES" | "UGX" | "GHS" | "CDF" | "ETB";
  setSelectedCountry: (country: "KES" | "UGX" | "GHS" | "CDF" | "ETB") => void;
  isValidating: boolean;
  validationResult: any;
  amount?: string;
}

type PaymentStatus = "idle" | "creating_payment_method" | "depositing_to_contract" | "success" | "error";

interface UserAsset {
  amount: string;
  asset_type: string;
  metadata: {
    name: string;
    symbol: string;
    decimals: number;
    icon_uri?: string;
  };
}

const PayFormComponent = ({
  phoneNumber,
  setPhoneNumber,
  accountNumber,
  setAccountNumber,
  paymentType,
  setPaymentType,
  mobileNetwork,
  setMobileNetwork,
  selectedCountry,
  setSelectedCountry,
  isValidating,
  validationResult,
  amount: externalAmount,
}: PayFormProps) => {
  const currentCountry = useMemo(() => COUNTRIES[selectedCountry], [selectedCountry]);
  const availableNetworks = useMemo(() => MOBILE_NETWORKS[selectedCountry], [selectedCountry]);
  
  const { account, signAndSubmitTransaction, network } = useWallet();
  const { toast } = useToast();
  
  const [amount, setAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [userAssets, setUserAssets] = useState<UserAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<UserAsset | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);
  
  // Memoize the currency to prevent unnecessary re-renders
  const currency = useMemo(() => currentCountry.currency, [currentCountry.currency]);
  
  // Use the exchange rate hook with memoized currency
  const { exchangeRate, isLoadingExchangeRate, isUsingFallback } = useExchangeRate(currency);
  
  const isProcessing = paymentStatus !== "idle" && paymentStatus !== "success" && paymentStatus !== "error";

  // Memoize the fetchUserAssets function
  const fetchUserAssets = useCallback(async () => {
    if (!account?.address) {
      setUserAssets([]);
      setSelectedAsset(null);
      return;
    }

    setLoadingAssets(true);
    try {
      const assets = await getUserCoinBalances(account.address.toString(), network);
      const filteredAssets = assets.filter((asset: any) => 
        parseFloat(asset.amount) > 0 && asset.metadata?.symbol
      );
      setUserAssets(filteredAssets);
      
      // Auto-select the first asset if none is selected
      setSelectedAsset(prev => {
        if (!prev && filteredAssets.length > 0) {
          return filteredAssets[0];
        }
        return prev;
      });
    } catch (error) {
      console.error("Error fetching user assets:", error);
      toast({
        variant: "destructive",
        title: "Failed to load assets",
        description: "Could not fetch your wallet assets"
      });
    } finally {
      setLoadingAssets(false);
    }
  }, [account?.address, network, toast]);

  // Fetch user's assets when wallet connects
  useEffect(() => {
    fetchUserAssets();
  }, [fetchUserAssets]);

  const getProviderIdFromNetwork = (network: string, country: string) => {
    const networkMap: Record<string, Record<string, string>> = {
      KES: { Safaricom: "mpesa", Airtel: "airtel-ke" },
      UGX: { MTN: "mtn-ug", Airtel: "airtel-ug" },
      GHS: { MTN: "mtn-gh", AirtelTigo: "airteltigo-gh" },
      CDF: { "Airtel Money": "airtel-cd", "Orange Money": "orange-cd" },
      ETB: { Telebirr: "telebirr", "Cbe Birr": "cbe-et" },
    };
    return networkMap[country]?.[network] || network.toLowerCase();
  };

  const formatAssetAmount = (amount: string, decimals: number) => {
    return (parseFloat(amount) / Math.pow(10, decimals)).toFixed(6);
  };


  // Memoize asset price function
  const getAssetPriceInUSDC = useCallback((symbol: string): number => {
    const mockPrices: Record<string, number> = {
      APT: 8.5, // 1 APT = 8.5 USDC
      USDC: 1, // 1 USDC = 1 USDC
      USDT: 1, // 1 USDT = 1 USDC (roughly)
      BTC: 65000, // Mock BTC price
      ETH: 2400, // Mock ETH price
    };
    return mockPrices[symbol] || 1;
  }, []);

  // Memoize calculation functions to prevent unnecessary re-renders
  const calculateAssetAmount = useMemo(() => {
    return (fiatAmount: string): number => {
      if (!selectedAsset || !exchangeRate || !fiatAmount) return 0;
      
      const fiatValue = parseFloat(fiatAmount);
      const usdcValue = fiatValue / exchangeRate; // Convert fiat to USDC
      const assetPrice = getAssetPriceInUSDC(selectedAsset.metadata.symbol);
      const assetAmount = usdcValue / assetPrice; // Convert USDC to asset
      
      return assetAmount;
    };
  }, [selectedAsset, exchangeRate, getAssetPriceInUSDC]);

  // Helper function to convert asset amount to octas (smallest unit)
  const convertToOctas = useCallback((assetAmount: number, decimals: number): string => {
    return Math.floor(assetAmount * Math.pow(10, decimals)).toString();
  }, []);

  // Memoize balance check
  const hasSufficientBalance = useMemo(() => {
    return (): boolean => {
      if (!selectedAsset || !amount) return true;
      
      const requiredAssetAmount = calculateAssetAmount(amount);
      const availableBalance = parseFloat(formatAssetAmount(selectedAsset.amount, selectedAsset.metadata.decimals));
      
      return requiredAssetAmount <= availableBalance;
    };
  }, [selectedAsset, amount, calculateAssetAmount]);

  const handlePayment = async () => {
    if (!account?.address || !signAndSubmitTransaction) {
      toast({
        variant: "destructive", 
        title: "Wallet not connected",
        description: "Please connect your wallet to continue"
      });
      return;
    }

    if (!phoneNumber || !mobileNetwork || !amount || parseFloat(amount) <= 0 || !selectedAsset || !exchangeRate) {
      toast({
        variant: "destructive",
        title: "Invalid input",
        description: "Please fill in all fields and select an asset to convert"
      });
      return;
    }

    // Check if user has enough balance using the new calculation
    if (!hasSufficientBalance()) {
      const requiredAssetAmount = calculateAssetAmount(amount);
      toast({
        variant: "destructive",
        title: "Insufficient balance",
        description: `You need ${requiredAssetAmount.toFixed(6)} ${selectedAsset.metadata.symbol} but only have ${formatAssetAmount(selectedAsset.amount, selectedAsset.metadata.decimals)} available`
      });
      return;
    }

    try {
      setPaymentStatus("creating_payment_method");
      setStatusMessage("Creating payment method...");

      const providerId = getProviderIdFromNetwork(mobileNetwork, selectedCountry);
      const paymentMethod = await addPaymentMethod({
        owner: account.address.toString(),
        payment_method_type: "mobile-money",
        identity: phoneNumber,
        provider_id: providerId,
      });

      setPaymentStatus("depositing_to_contract");
      setStatusMessage("Depositing funds to smart contract...");
      
      // Calculate the exact asset amount shown to user and convert to octas
      const assetAmountNeeded = calculateAssetAmount(amount);
      const amountInOctas = convertToOctas(assetAmountNeeded, selectedAsset.metadata.decimals);
      console.log('Asset amount needed:', amountInOctas);
      
      console.log('Sending to contract:', {
        assetAmountNeeded: assetAmountNeeded.toFixed(6),
        amountInOctas,
        decimals: selectedAsset.metadata.decimals,
        assetType: selectedAsset.asset_type
      });
      console.log('Amount in octas:', amountInOctas);
      console.log('Asset type (metadata address):', selectedAsset.asset_type);
      console.log('Full selected asset data:', selectedAsset);
      
      await depositFungibleToContract(
        signAndSubmitTransaction,
        amountInOctas,
        selectedAsset.asset_type
      );

      setPaymentStatus("success");
      setStatusMessage("Payment processed successfully!");
      toast({
        title: "Success",
        description: "Payment completed successfully!"
      });

    } catch (error) {
      console.error("Payment error:", error);
      setPaymentStatus("error");
      setStatusMessage("Failed to process payment. Please try again.");
      toast({
        variant: "destructive",
        title: "Payment failed",
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  };

  return (
    <div className="space-y-3 mt-6">
      {/* Header with Pay label and Asset Selection */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Pay</h3>
        
        {/* Asset Selection */}
        <div>
          {loadingAssets ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 backdrop-blur-md border border-white/20 rounded text-sm">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-400">Loading...</span>
            </div>
          ) : userAssets.length === 0 ? (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
              No assets found
            </div>
          ) : (
            <Select
              value={selectedAsset?.asset_type || ""}
              onValueChange={(value) => {
                const asset = userAssets.find(a => a.asset_type === value);
                setSelectedAsset(asset || null);
              }}
            >
              <SelectTrigger className="min-w-[120px] bg-white/5 backdrop-blur-md border-white/20 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all duration-200 shadow-lg">
                <div className="flex items-center gap-2">
                  {selectedAsset ? (
                    <>
                      {selectedAsset.metadata.symbol === 'APT' ? (
                        <img 
                          src="/images/aptos-new.png" 
                          alt="APT"
                          className="w-5 h-5 rounded-full"
                        />
                      ) : selectedAsset.metadata.icon_uri ? (
                        <img 
                          src={selectedAsset.metadata.icon_uri} 
                          alt={selectedAsset.metadata.symbol}
                          className="w-5 h-5 rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white">
                          {selectedAsset.metadata.symbol.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium">{selectedAsset.metadata.symbol}</span>
                    </>
                  ) : (
                    <span className="text-gray-400">Select Asset</span>
                  )}
                </div>
              </SelectTrigger>
              <SelectContent
                position="popper"
                sideOffset={4}
                className="z-[100003] bg-black/90 border-white/10"
              >
                {userAssets.map((asset) => (
                  <SelectItem key={asset.asset_type} value={asset.asset_type} className="text-white">
                    <div className="flex items-center gap-2">
                      {asset.metadata.symbol === 'APT' ? (
                        <img 
                          src="/images/aptos-apt-logo.png" 
                          alt="APT"
                          className="w-5 h-5 rounded-full"
                        />
                      ) : asset.metadata.icon_uri ? (
                        <img 
                          src={asset.metadata.icon_uri} 
                          alt={asset.metadata.symbol}
                          className="w-5 h-5 rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white">
                          {asset.metadata.symbol.charAt(0)}
                        </div>
                      )}
                      <span>{asset.metadata.symbol}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Country Selection */}
      <div>
        <Label htmlFor="country-select" className="text-sm text-gray-400 pb-2">
          Select Country
        </Label>
        <Select
          value={selectedCountry}
          onValueChange={(value) =>
            setSelectedCountry(value as typeof selectedCountry)
          }
        >
          <SelectTrigger className="w-full bg-white/5 backdrop-blur-md border-white/20 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all duration-200 shadow-lg">
            <div className="flex items-center gap-3">
              <span className="text-xl">{currentCountry.flag}</span>
              <span>{currentCountry.name} ({currentCountry.currency})</span>
            </div>
          </SelectTrigger>
          <SelectContent
            position="popper"
            sideOffset={4}
            className="z-[100003] bg-black/90 border-white/10"
          >
            {Object.entries(COUNTRIES).map(([code, country]) => (
              <SelectItem key={code} value={code} className="text-white">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{country.flag}</span>
                  <span>{country.name} ({country.currency})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Payment Type Tabs - Only for Kenya */}
      {selectedCountry === "KES" && (
        <div className="space-y-2">
          <Label className="text-sm text-gray-400">Payment Type</Label>
          <Tabs value={paymentType} onValueChange={(value) => setPaymentType(value as "MOBILE" | "PAYBILL" | "BUY_GOODS")}>
            <TabsList className="grid w-full grid-cols-3 bg-white/5 backdrop-blur-md border border-white/20">
              <TabsTrigger 
                value="MOBILE" 
                className="data-[state=active]:bg-primary data-[state=active]:text-black text-gray-400 hover:text-white text-xs font-normal"
              >
                Mobile Number
              </TabsTrigger>
              <TabsTrigger 
                value="PAYBILL"
                className="data-[state=active]:bg-primary data-[state=active]:text-black text-gray-400 hover:text-white text-xs font-normal"
              >
                Paybill
              </TabsTrigger>
              <TabsTrigger 
                value="BUY_GOODS"
                className="data-[state=active]:bg-primary data-[state=active]:text-black text-gray-400 hover:text-white text-xs font-normal"
              >
                Buy Goods
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      

      {/* Mobile Network */}
      {availableNetworks.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-gray-400">Mobile Network</Label>
          <Select
            value={mobileNetwork}
            onValueChange={setMobileNetwork}
          >
            <SelectTrigger className="bg-white/5 backdrop-blur-md border-white/20 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all duration-200 shadow-lg">
              <SelectValue placeholder="Select network" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              sideOffset={4}
              className="z-[100003] bg-black/90 border-white/10"
            >
              {availableNetworks.map((network) => (
                <SelectItem key={network} value={network} className="text-white">
                  {network}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Phone/Shortcode field */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm text-gray-400">
          {selectedCountry === "KES"
            ? paymentType === "MOBILE"
              ? "Phone Number"
              : paymentType === "PAYBILL"
                ? "Paybill Number"
                : "Till Number"
            : "Phone Number"}
        </Label>
        <div className="space-y-2">
          <Input
            id="phone"
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.target.value);
            }}
            placeholder={
              selectedCountry === "KES"
                ? paymentType === "MOBILE"
                  ? "0712345678"
                  : paymentType === "PAYBILL"
                    ? "123456"
                    : "890123"
                : "0712345678"
            }
            className="bg-white/5 backdrop-blur-md border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all duration-200 shadow-lg"
          />
          {isValidating && (
            <div className="text-sm text-primary">
              Validating number...
            </div>
          )}
        </div>
        {validationResult && (
          <div className="p-2 bg-primary/10 border border-primary/20 rounded text-sm text-primary">
            {(validationResult as { data?: { public_name?: string } })
              ?.data?.public_name || "Valid recipient"}
          </div>
        )}
      </div>

      {/* Account Number field - only shown for PAYBILL in Kenya */}
      {selectedCountry === "KES" && paymentType === "PAYBILL" && (
        <div className="space-y-2">
          <Label htmlFor="paybill-account-number" className="text-sm text-gray-400">Account Number</Label>
          <Input
            id="paybill-account-number"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="Enter account number"
            required={paymentType === "PAYBILL"}
            className="bg-white/5 backdrop-blur-md border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all duration-200 shadow-lg"
          />
          <div className="text-sm text-gray-400">
            Enter the account number for this paybill
          </div>
        </div>
      )}
      {/* Amount Input Section */}
      <div className="space-y-4">
        <Label className="text-sm text-gray-400">Enter Amount in {currentCountry.currency}</Label>
        
        <div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-lg p-4">
          {/* Amount Input */}
          <div className="flex items-center justify-between pb-4 ">
            <span className="text-3xl font-bold text-white">{currentCountry.currency}</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="1"
              step="1"
              className="bg-primary/5 px-2 rounded-xl  text-right text-4xl font-bold text-white placeholder:text-gray-500 focus:ring-0 focus:outline-none w-56 py-1 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
            />
          </div>
          
          {/* Insufficient balance error */}
          {parseFloat(amount || "0") > 0 && selectedAsset && !hasSufficientBalance() && (
            <div className="text-sm text-red-400 mb-4">
              Insufficient balance for this amount
            </div>
          )}

          {/* You'll pay section */}
          {parseFloat(amount || "0") > 0 && selectedAsset && exchangeRate && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">You'll pay</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-300">
                    {calculateAssetAmount(amount).toFixed(6)}
                  </span>
                  <div className="flex items-center gap-1">
                    {selectedAsset.metadata.symbol === 'APT' ? (
                      <img 
                        src="/images/aptos-new.png" 
                        alt="APT"
                        className="w-4 h-4 rounded-full"
                      />
                    ) : selectedAsset.metadata.icon_uri ? (
                      <img 
                        src={selectedAsset.metadata.icon_uri} 
                        alt={selectedAsset.metadata.symbol}
                        className="w-4 h-4 rounded-full"
                      />
                    ) : (
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white">
                        {selectedAsset.metadata.symbol.charAt(0)}
                      </div>
                    )}
                    <span className="text-gray-300">{selectedAsset.metadata.symbol}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                Balance: {formatAssetAmount(selectedAsset.amount, selectedAsset.metadata.decimals)} {selectedAsset.metadata.symbol}
              </div>

              <div className="text-xs text-gray-500">
                1 USDC = {exchangeRate} {currentCountry.currency}
                {isUsingFallback && <span className="text-yellow-400 ml-1">(estimated)</span>}
              </div>

              {/* Summary section */}
              <div className="border-t border-gray-700 pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total {currentCountry.currency}</span>
                  <span className="text-white font-semibold">{amount || "0.00"} {currentCountry.currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Amount in USDC</span>
                  <span className="text-white font-semibold">
                    {parseFloat(amount || "0") > 0 && exchangeRate 
                      ? (parseFloat(amount) / exchangeRate).toFixed(2)
                      : "0.00"} USDC
                  </span>
                </div>
              </div>

              <div className="text-xs text-gray-500 pt-2">
                1 {selectedAsset.metadata.symbol} = {getAssetPriceInUSDC(selectedAsset.metadata.symbol)} USDC
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Display */}
      {paymentStatus !== "idle" && (
        <div className="space-y-2">
          <div className="p-3 bg-primary/10 border border-primary/20 rounded text-sm">
            <div className="flex items-center gap-2">
              {isProcessing && (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
              <span className="text-primary">{statusMessage}</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-end gap-2">
        <Button
          onClick={handlePayment}
          disabled={
            isProcessing || 
            !account?.address || 
            !selectedAsset || 
            userAssets.length === 0 || 
            parseFloat(amount || "0") <= 0 ||
            !exchangeRate ||
            isLoadingExchangeRate ||
            (parseFloat(amount || "0") > 0 && !hasSufficientBalance())
          }
          variant="primary"
          className="w-full"
        >
          {isProcessing 
            ? "Processing..." 
            : parseFloat(amount || "0") > 0 && selectedAsset && !hasSufficientBalance()
              ? "Insufficient Balance"
              : isLoadingExchangeRate
                ? "Loading rates..."
                : !exchangeRate
                  ? "Exchange rate unavailable"
                  : "Send Money"}
        </Button>
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const PayForm = React.memo(PayFormComponent);