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
import {
  createPaymentSession,
  addPaymentMethod,
  depositFungibleToContract,
  getPaymentStatus,
  aptosClient,
} from "@/utils/index";
import tokenList from "@/utils/token-list.json";
import { useToast } from "@/components/ui/use-toast";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { useUserAssets } from "@/hooks/useUserAssets";
import { useProviders } from "@/hooks/useProviders";
import { useConversion } from "@/hooks/useConversion";
import { XCircle, CreditCard } from "lucide-react";
import { PaymentMethodDialog } from "./PaymentMethodDialog";

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

type PaymentStatus =
  | "idle"
  | "creating_payment_session"
  | "creating_payment_method"
  | "depositing_to_contract"
  | "checking_status"
  | "success"
  | "error";

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
  const { providers, isLoading: isLoadingProviders, isError: isProvidersError, error: providersError, getProvidersByCountry, getCountries, refetch: refetchProviders } = useProviders();
  
  const countries = getCountries();
  const currentCountry = useMemo(
    () => countries.find(c => c.code === selectedCountry),
    [countries, selectedCountry]
  );
  const availableProviders = useMemo(
    () => getProvidersByCountry(selectedCountry),
    [getProvidersByCountry, selectedCountry]
  );

  const { account, signAndSubmitTransaction, network } = useWallet();
  const { toast } = useToast();
  const { userAssets, isLoadingAssets } = useUserAssets();

  const [amount, setAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<UserAsset | null>(null);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);

  // Function to clear all form fields
  const clearForm = () => {
    setAmount("");
    setPhoneNumber("");
    setAccountNumber("");
    setPaymentStatus("idle");
    setStatusMessage("");
    setSelectedAsset(null);
    setSelectedPaymentMethodId(null);
    setPaymentType("MOBILE");
    setMobileNetwork("");
  };

  // Memoize the currency to prevent unnecessary re-renders
  const currency = useMemo(
    () => currentCountry?.currency || selectedCountry,
    [currentCountry?.currency, selectedCountry]
  );

  // Use the exchange rate hook with memoized currency
  const { exchangeRate, isLoadingExchangeRate, isUsingFallback } =
    useExchangeRate(currency);

  // Use conversion hook for APT to KES conversion
  const conversionParams = useMemo(() => {
    if (!selectedAsset || !amount || parseFloat(amount) <= 0) return null;
    
    return {
      from:   currency.toLowerCase(),
      to: selectedAsset.metadata.symbol.toLowerCase(),
      amount: parseFloat(amount)
    };
  }, [selectedAsset, amount, currency]);

  const { 
    data: conversionData, 
    isLoading: isLoadingConversion, 
    error: conversionError 
  } = useConversion(conversionParams);

  const isProcessing =
    paymentStatus !== "idle" &&
    paymentStatus !== "success" &&
    paymentStatus !== "error";

  // Auto-select the first asset if none is selected
  useEffect(() => {
    if (userAssets.length > 0 && !selectedAsset) {
      setSelectedAsset(userAssets[0]);
    }
  }, [userAssets, selectedAsset]);

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
      if (!selectedAsset || !fiatAmount) return 0;

      // Use conversion data if available - the converted field is already the APT amount
      if (conversionData && conversionData.converted > 0) {
        return conversionData.converted;
      }

      // Fallback to manual calculation if conversion data is not available
      if (!exchangeRate) return 0;
      
      const fiatValue = parseFloat(fiatAmount);
      const usdcValue = fiatValue / exchangeRate; // Convert fiat to USDC
      const assetPrice = getAssetPriceInUSDC(selectedAsset.metadata.symbol);
      const assetAmount = usdcValue / assetPrice; // Convert USDC to asset

      return assetAmount;
    };
  }, [selectedAsset, exchangeRate, getAssetPriceInUSDC, conversionData]);

  // Helper function to convert asset amount to octas (smallest unit)
  const convertToOctas = useCallback(
    (assetAmount: number, decimals: number): string => {
      return Math.floor(assetAmount * Math.pow(10, decimals)).toString();
    },
    []
  );

  // Memoize balance check
  const hasSufficientBalance = useMemo(() => {
    return (): boolean => {
      if (!selectedAsset || !amount) return true;

      const requiredAssetAmount = calculateAssetAmount(amount);
      const availableBalance = parseFloat(
        formatAssetAmount(selectedAsset.amount, selectedAsset.metadata.decimals)
      );

      return requiredAssetAmount <= availableBalance;
    };
  }, [selectedAsset, amount, calculateAssetAmount]);

  const handlePaymentMethodSelect = useCallback((phoneNumber: string, paymentMethodId?: string) => {
    setPhoneNumber(phoneNumber);
    setSelectedPaymentMethodId(paymentMethodId || null);
  }, [setPhoneNumber]);

  const handleCreateNewPaymentMethod = useCallback(() => {
    setSelectedPaymentMethodId(null);
    setPhoneNumber("");
  }, [setPhoneNumber]);

  const handlePayment = async () => {
    if (!account?.address || !signAndSubmitTransaction) {
      toast({
        variant: "destructive",
        title: "Wallet not connected",
        description: "Please connect your wallet to continue",
      });
      return;
    }

    if (
      !phoneNumber ||
      !mobileNetwork ||
      !amount ||
      parseFloat(amount) <= 0 ||
      parseFloat(amount) < 20 ||
      !selectedAsset ||
      !exchangeRate
    ) {
      toast({
        variant: "destructive",
        title: "Invalid input",
        description: parseFloat(amount || "0") > 0 && parseFloat(amount || "0") < 20 
          ? "Minimum amount is 20" 
          : "Please fill in all fields and select an asset to convert",
      });
      return;
    }

    // Check if user has enough balance using the new calculation
    if (!hasSufficientBalance()) {
      const requiredAssetAmount = calculateAssetAmount(amount);
      toast({
        variant: "destructive",
        title: "Insufficient balance",
        description: `You need ${requiredAssetAmount.toFixed(6)} ${selectedAsset.metadata.symbol} but only have ${formatAssetAmount(selectedAsset.amount, selectedAsset.metadata.decimals)} available`,
      });
      return;
    }

    try {
      setPaymentStatus("creating_payment_session");
      setStatusMessage("Creating payment session...");

      const providerId = getProviderIdFromNetwork(
        mobileNetwork,
        selectedCountry
      );

      // Create payment session first
      const paymentSession = await createPaymentSession({
        payer: account.address.toString(),
        provider: mobileNetwork.toLowerCase(),
        receiver_id: phoneNumber,
        token: "0xa"
      });

      console.log("Payment session created:", paymentSession);

      // Only create payment method if we don't have an existing one
      if (!selectedPaymentMethodId) {
        setPaymentStatus("creating_payment_method");
        setStatusMessage("Creating payment method...");

        const paymentMethod = await addPaymentMethod({
          owner: account.address.toString(),
          payment_method_type: "mobile-money",
          identity: phoneNumber,
          provider_id: mobileNetwork.toLowerCase(),
        });

        console.log("Payment method created:", paymentMethod);
      } else {
        console.log("Using existing payment method:", selectedPaymentMethodId);
      }

      setPaymentStatus("depositing_to_contract");
      setStatusMessage("Depositing funds to smart contract...");

      // Calculate the exact asset amount shown to user and convert to octas
      const assetAmountNeeded = calculateAssetAmount(amount);
      const amountInOctas = convertToOctas(
        assetAmountNeeded,
        selectedAsset.metadata.decimals
      );
      console.log("Asset amount needed:", amountInOctas);

      console.log("Sending to contract:", {
        assetAmountNeeded: assetAmountNeeded.toFixed(6),
        amountInOctas,
        decimals: selectedAsset.metadata.decimals,
        assetType: selectedAsset.asset_type,
      });
      console.log("Amount in octas:", amountInOctas);
      console.log("Asset type (metadata address):", selectedAsset.asset_type);
      console.log("Full selected asset data:", selectedAsset);

      await depositFungibleToContract(
        signAndSubmitTransaction,
        amountInOctas,
        selectedAsset.asset_type,
        paymentSession
      );

      setPaymentStatus("checking_status");
      setStatusMessage("Checking payment status...");

      // Check payment status using the payment session response with polling
      const paymentCode = paymentSession?.session_id || paymentSession?.id;
      if (paymentCode) {
        try {
          // Poll for payment status with timeout
          const pollPaymentStatus = async (maxAttempts = 30, interval = 2000) => {
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
              console.log(`Checking payment status - attempt ${attempt}/${maxAttempts}`);
              
              try {
                const statusResponse = await getPaymentStatus(paymentCode);
                console.log("Payment status response:", statusResponse);
                
                // Check if payment is completed
                if (statusResponse.status === "Completed" || statusResponse.status === "completed") {
                  return statusResponse;
                }
                
                // Update status message with current status
                setStatusMessage(`Payment ${statusResponse.status.toLowerCase()}...`);
                
                // If not completed and not the last attempt, wait before next check
                if (attempt < maxAttempts) {
                  await new Promise(resolve => setTimeout(resolve, interval));
                }
              } catch (error) {
                console.error(`Status check attempt ${attempt} failed:`, error);
                // If it's the last attempt, throw the error
                if (attempt === maxAttempts) {
                  throw error;
                }
                // Otherwise, wait and retry
                await new Promise(resolve => setTimeout(resolve, interval));
              }
            }
            
            // If we reach here, payment didn't complete within timeout
            throw new Error("Payment status check timeout - payment may still be processing");
          };
          
          const finalStatus = await pollPaymentStatus();
          
          setPaymentStatus("success");
          setStatusMessage(`Payment ${finalStatus.status.toLowerCase()}! Receipt: ${finalStatus.data?.receipt || 'N/A'}`);
          toast({
            title: "Success",
            description: `Payment completed successfully! Receipt: ${finalStatus.data?.receipt || 'N/A'}`,
          });
          
          // Clear form after successful payment
          setTimeout(() => {
            clearForm();
          }, 3000); // Wait 3 seconds to let user see the success message
        } catch (statusError) {
          console.error("Error checking payment status:", statusError);
          // Still mark as success since the contract transaction succeeded
          setPaymentStatus("success");
          setStatusMessage("Payment processed successfully! (Status check timed out)");
          toast({
            title: "Success", 
            description: "Payment completed successfully! Status check timed out but transaction succeeded.",
          });
          
          // Clear form after successful payment
          setTimeout(() => {
            clearForm();
          }, 3000);
        }
      } else {
        setPaymentStatus("success");
        setStatusMessage("Payment processed successfully!");
        toast({
          title: "Success",
          description: "Payment completed successfully!",
        });
        
        // Clear form after successful payment
        setTimeout(() => {
          clearForm();
        }, 3000);
      }
    } catch (error) {
      console.error("Payment error:", error);
      setPaymentStatus("error");
      setStatusMessage("Failed to process payment. Please try again.");
      toast({
        variant: "destructive",
        title: "Payment failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
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
          {isLoadingAssets ? (
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
                const asset = userAssets.find((a) => a.asset_type === value);
                setSelectedAsset(asset || null);
              }}
            >
              <SelectTrigger className="min-w-[120px] bg-white/5 backdrop-blur-md border-white/20 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all duration-200 shadow-lg">
                <div className="flex items-center gap-2">
                  {selectedAsset ? (
                    <>
                      {selectedAsset.metadata.symbol === "APT" ? (
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
                      <span className="font-medium">
                        {selectedAsset.metadata.symbol}
                      </span>
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
                  <SelectItem
                    key={asset.asset_type}
                    value={asset.asset_type}
                    className="text-white"
                  >
                    <div className="flex items-center gap-2">
                      {asset.metadata.symbol === "APT" ? (
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
        {isLoadingProviders ? (
          <div className="p-3 bg-white/5 border border-white/20 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-400">Loading countries...</span>
            </div>
          </div>
        ) : isProvidersError ? (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-400">Failed to load countries</span>
              </div>
              <Button
                onClick={() => refetchProviders()}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Retry
              </Button>
            </div>
            <div className="text-xs text-red-300 mt-1">
              {providersError?.message || 'Unknown error'}
            </div>
          </div>
        ) : (
          <Select
            value={selectedCountry}
            onValueChange={(value) =>
              setSelectedCountry(value as typeof selectedCountry)
            }
          >
            <SelectTrigger className="w-full bg-white/5 backdrop-blur-md border-white/20 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all duration-200 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="text-xl">{currentCountry?.flag}</span>
                <span>
                  {currentCountry?.name} ({currentCountry?.currency})
                </span>
              </div>
            </SelectTrigger>
            <SelectContent
              position="popper"
              sideOffset={4}
              className="z-[100003] bg-black/90 border-white/10"
            >
              {countries.map((country) => (
                <SelectItem key={country.code} value={country.code} className="text-white">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{country.flag}</span>
                    <span>
                      {country.name} ({country.currency})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Payment Type Tabs - Only for Kenya */}
      {selectedCountry === "KES" && (
        <div className="space-y-2">
          <Label className="text-sm text-gray-400">Payment Type</Label>
          <Tabs
            value={paymentType}
            onValueChange={(value) =>
              setPaymentType(value as "MOBILE" | "PAYBILL" | "BUY_GOODS")
            }
          >
            <TabsList className="grid w-full grid-cols-2 bg-white/5 backdrop-blur-md">
              <TabsTrigger
                value="MOBILE"
                className="data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:rounded-lg text-gray-400 hover:text-white text-xs font-normal"
              >
                Mobile Number
              </TabsTrigger>
              {/* <TabsTrigger
                value="PAYBILL"
                className="data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:rounded-lg text-gray-400 hover:text-white text-xs font-normal"
              >
                Paybill
              </TabsTrigger> */}
              <TabsTrigger
                value="BUY_GOODS"
                className="data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:rounded-lg text-gray-400 hover:text-white text-xs font-normal"
              >
                Buy Goods
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Mobile Network */}
      {isLoadingProviders ? (
        <div className="space-y-2">
          <Label className="text-sm text-gray-400">Mobile Network</Label>
          <div className="p-3 bg-white/5 border border-white/20 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-400">Loading networks...</span>
            </div>
          </div>
        </div>
      ) : isProvidersError ? (
        <div className="space-y-2">
          <Label className="text-sm text-gray-400">Mobile Network</Label>
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-400">Failed to load networks</span>
              </div>
              <Button
                onClick={() => refetchProviders()}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      ) : availableProviders.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-sm text-gray-400">Mobile Network</Label>
          <Select value={mobileNetwork} onValueChange={setMobileNetwork}>
            <SelectTrigger className="bg-white/5 backdrop-blur-md border-white/20 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all duration-200 shadow-lg">
              <SelectValue placeholder="Select network" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              sideOffset={4}
              className="z-[100003] bg-black/90 border-white/10"
            >
              {availableProviders.map((provider) => (
                <SelectItem
                  key={provider.id}
                  value={provider.name}
                  className="text-white"
                >
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-sm text-gray-400">Mobile Network</Label>
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <span className="text-sm text-red-400">No networks available for this country</span>
          </div>
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
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(true)}
              disabled={paymentStatus !== "idle"}
              className="bg-white/5 backdrop-blur-md border-white/20 text-white hover:text-gray-600 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 shadow-lg flex-shrink-0"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Select
            </Button>
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
              className="bg-white/5 backdrop-blur-md border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all duration-200 shadow-lg flex-1"
            />
          </div>
          {selectedPaymentMethodId && (
            <p className="text-xs text-green-400">✓ Ok</p>
          )}
          {isValidating && (
            <div className="text-sm text-primary">Validating number...</div>
          )}
        </div>
        {validationResult && (
          <div className="p-2 bg-primary/10 border border-primary/20 rounded-xl text-sm text-primary">
            {(validationResult as { data?: { public_name?: string } })?.data
              ?.public_name || "Valid recipient"}
          </div>
        )}
      </div>

      {/* Account Number field - only shown for PAYBILL in Kenya */}
      {selectedCountry === "KES" && paymentType === "PAYBILL" && (
        <div className="space-y-2">
          <Label
            htmlFor="paybill-account-number"
            className="text-sm text-gray-400"
          >
            Account Number
          </Label>
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
        <Label className="text-sm text-gray-400">
          Enter Amount in {currentCountry?.currency || selectedCountry}
        </Label>

        <div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-lg p-4">
          {/* Amount Input */}
          <div className="flex items-center justify-between pb-4 ">
            <span className="text-3xl font-bold text-white">
              {currentCountry?.currency || selectedCountry}
            </span>
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

          {/* Amount validation errors */}
          {parseFloat(amount || "0") > 0 && parseFloat(amount || "0") < 20 && (
            <div className="text-sm text-red-400 mb-4">
              Minimum amount is 20 {currentCountry?.currency || selectedCountry}
            </div>
          )}
          {parseFloat(amount || "0") >= 20 &&
            selectedAsset &&
            !hasSufficientBalance() && (
              <div className="text-sm text-red-400 mb-4">
                Insufficient balance for this amount
              </div>
            )}

          {/* You'll pay section */}
          {parseFloat(amount || "0") > 0 && selectedAsset && (exchangeRate || conversionData) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">You'll pay</span>
                <div className="flex items-center gap-2">
                  {isLoadingConversion ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-gray-400">Calculating...</span>
                    </div>
                  ) : (
                    <>
                      <span className="text-gray-300">
                        {calculateAssetAmount(amount).toFixed(6)}
                      </span>
                      <div className="flex items-center gap-1">
                        {selectedAsset.metadata.symbol === "APT" ? (
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
                        <span className="text-gray-300">
                          {selectedAsset.metadata.symbol}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-gray-500">
                  {conversionData ? (
                    <>
                      1 {selectedAsset.metadata.symbol} = {(conversionData.to_usd_quote).toFixed(2)} USD
                      <br />
                      1 USD = {conversionData.from_usd_quote} {currentCountry?.currency || selectedCountry}
                    </>
                  ) : (
                    <>
                      1 USD = {exchangeRate} {currentCountry?.currency || selectedCountry}
                      {isUsingFallback && (
                        <span className="text-yellow-400 ml-1">(estimated)</span>
                      )}
                    </>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  Balance:{" "}
                  {formatAssetAmount(
                    selectedAsset.amount,
                    selectedAsset.metadata.decimals
                  )}{" "}
                  {selectedAsset.metadata.symbol}
                </div>
              </div>

              {/* Summary section */}
              <div className="border-t border-gray-700 pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">
                    Total {currentCountry?.currency || selectedCountry}
                  </span>
                  <span className="text-white font-semibold">
                    {amount || "0.00"} {currentCountry?.currency || selectedCountry}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Amount in USDC</span>
                  <span className="text-white font-semibold">
                    {parseFloat(amount || "0") > 0 && exchangeRate
                      ? (parseFloat(amount) / exchangeRate).toFixed(2)
                      : "0.00"}{" "}
                    USDC
                  </span>
                </div>
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
            parseFloat(amount || "0") < 20 ||
            !exchangeRate ||
            isLoadingExchangeRate ||
            (parseFloat(amount || "0") >= 20 && !hasSufficientBalance())
          }
          variant="primary"
          className="w-full"
        >
          {isProcessing
            ? "Processing..."
            : parseFloat(amount || "0") > 0 && parseFloat(amount || "0") < 20
              ? "Minimum amount is 20"
              : parseFloat(amount || "0") >= 20 &&
                selectedAsset &&
                !hasSufficientBalance()
                ? "Insufficient Balance"
                : isLoadingExchangeRate
                  ? "Loading rates..."
                  : !exchangeRate
                    ? "Exchange rate unavailable"
                    : "Send Money"}
        </Button>
      </div>

      <PaymentMethodDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSelect={handlePaymentMethodSelect}
        onCreateNew={handleCreateNewPaymentMethod}
      />
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const PayForm = React.memo(PayFormComponent);
