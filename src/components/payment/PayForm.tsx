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
  getPaymentStatus,
  aptosClient,
  depositFungibleToContractSponsored,
} from "@/utils/index";
import tokenList from "@/utils/token-list.json";
import { useToast } from "@/components/ui/use-toast";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { useCryptoBalances } from "@/hooks/useCryptoBalances";
import { useProviders } from "@/hooks/useProviders";
import { useConversion } from "@/hooks/useConversion";
import { useSupportedCurrencies, SupportedCurrency } from "@/hooks/useSupportedCurrencies";
import { XCircle, CreditCard } from "lucide-react";
import { PaymentMethodDialog } from "./PaymentMethodDialog";
import Image from "next/image";

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

  const { account, signAndSubmitTransaction, signTransaction, submitTransaction, network } = useWallet();
  const { toast } = useToast();
  const { 
    cryptoBalances, 
    isLoading: isLoadingBalances,
    getBalanceById,
    hasSufficientBalance: checkSufficientBalance
  } = useCryptoBalances();
  const { 
    cryptoCurrencies, 
    isLoading: isLoadingSupportedCurrencies, 
    isError: isSupportedCurrenciesError,
    error: supportedCurrenciesError,
    refetch: refetchSupportedCurrencies
  } = useSupportedCurrencies();

  console.log('cryptoCurrencies', cryptoCurrencies);

  // Show all crypto balances from supported currencies
  const availableCryptoBalances = useMemo(() => {
    console.log('=== PayForm: All available crypto balances ===');
    console.log('Total cryptoBalances:', cryptoBalances.length);
    console.log('All cryptoBalances data:', cryptoBalances);
    
    return cryptoBalances;
  }, [cryptoBalances]);

  const [amount, setAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedCryptoCurrency, setSelectedCryptoCurrency] = useState<SupportedCurrency | null>(null);
  
  // Find the corresponding crypto balance when a cryptocurrency is selected
  const selectedBalance = useMemo(() => {
    if (!selectedCryptoCurrency) return null;
    
    // Find matching balance by currency ID
    const matchingBalance = getBalanceById(selectedCryptoCurrency.id);
    
    console.log('Selected balance for', selectedCryptoCurrency.symbol, ':', matchingBalance);
    
    return matchingBalance || null;
  }, [selectedCryptoCurrency, getBalanceById]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);

  // Function to clear all form fields
  const clearForm = () => {
    setAmount("");
    setPhoneNumber("");
    setAccountNumber("");
    setPaymentStatus("idle");
    setStatusMessage("");
    setSelectedCryptoCurrency(null);
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

  // Use conversion hook for asset conversion
  const conversionParams = useMemo(() => {
    if (!selectedCryptoCurrency || !amount || parseFloat(amount) <= 0) return null;
    
    // Use the cryptocurrency ID for conversion
    const assetIdentifier = selectedCryptoCurrency.id;
    
    // console.log('Conversion using asset identifier:', {
    //   symbol: selectedCryptoCurrency.symbol,
    //   currencyId: selectedCryptoCurrency.id,
    //   using: assetIdentifier
    // });
    
    return {
      from: currency.toLowerCase(),
      to: assetIdentifier,
      amount: parseFloat(amount)
    };
  }, [selectedCryptoCurrency, amount, currency]);

  const { 
    data: conversionData, 
    isLoading: isLoadingConversion, 
    error: conversionError 
  } = useConversion(conversionParams);

  const isProcessing =
    paymentStatus !== "idle" &&
    paymentStatus !== "success" &&
    paymentStatus !== "error";

  // Auto-select the first available cryptocurrency if none is selected
  useEffect(() => {
    if (cryptoCurrencies.length > 0 && !selectedCryptoCurrency) {
      // Try to find a cryptocurrency that has a balance > 0
      const cryptoWithBalance = cryptoCurrencies.find(crypto => {
        const balance = getBalanceById(crypto.id);
        return balance && parseFloat(balance.balance.formatted) > 0;
      });
      
      if (cryptoWithBalance) {
        setSelectedCryptoCurrency(cryptoWithBalance);
      } else {
        // Fallback to first cryptocurrency
        setSelectedCryptoCurrency(cryptoCurrencies[0]);
      }
    }
  }, [cryptoCurrencies, selectedCryptoCurrency, getBalanceById]);


  // Note: formatAssetAmount is no longer needed as useCryptoBalances provides formatted amounts

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
      if (!selectedCryptoCurrency || !fiatAmount) return 0;

      // Use conversion data if available - the converted field is already the asset amount
      if (conversionData && conversionData.converted > 0) {
        return conversionData.converted;
      }

      // Fallback to manual calculation if conversion data is not available
      if (!exchangeRate) return 0;
      
      const fiatValue = parseFloat(fiatAmount);
      const usdcValue = fiatValue / exchangeRate; // Convert fiat to USDC
      const assetPrice = getAssetPriceInUSDC(selectedCryptoCurrency.symbol);
      const assetAmount = usdcValue / assetPrice; // Convert USDC to asset

      return assetAmount;
    };
  }, [selectedCryptoCurrency, exchangeRate, getAssetPriceInUSDC, conversionData]);

  // Helper function to convert asset amount to octas (smallest unit)
  const convertToOctas = useCallback(
    (assetAmount: number, decimals: number): string => {
      return Math.floor(assetAmount * Math.pow(10, decimals)).toString();
    },
    []
  );

  // Memoize balance check using useCryptoBalances helper
  const hasSufficientBalance = useMemo(() => {
    return (): boolean => {
      if (!selectedCryptoCurrency || !amount) return true;

      const requiredAssetAmount = calculateAssetAmount(amount);
      return checkSufficientBalance(selectedCryptoCurrency.id, requiredAssetAmount);
    };
  }, [selectedCryptoCurrency, amount, calculateAssetAmount, checkSufficientBalance]);

  const handlePaymentMethodSelect = useCallback((phoneNumber: string, paymentMethodId?: string) => {
    setPhoneNumber(phoneNumber);
    setSelectedPaymentMethodId(paymentMethodId || null);
  }, [setPhoneNumber]);

  const handleCreateNewPaymentMethod = useCallback(() => {
    setSelectedPaymentMethodId(null);
    setPhoneNumber("");
  }, [setPhoneNumber]);

  // Check if account number is required for paybill
  const isPaybill = useMemo(() => selectedCountry === "KES" && paymentType === "PAYBILL", [selectedCountry, paymentType]);
  const isAccountNumberRequired = useMemo(() => isPaybill && !accountNumber, [isPaybill, accountNumber]);

  const handlePayment = async () => {
    if (!account?.address || !signTransaction || !submitTransaction) {
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
      !selectedBalance ||
      !exchangeRate ||
      isAccountNumberRequired
    ) {
      toast({
        variant: "destructive",
        title: "Invalid input",
        description: parseFloat(amount || "0") > 0 && parseFloat(amount || "0") < 20 
          ? "Minimum amount is 20" 
          : isAccountNumberRequired
            ? "Please enter account number for paybill"
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
        description: `You need ${requiredAssetAmount.toFixed(6)} ${selectedBalance.currency.symbol} but only have ${selectedBalance.balance.formatted} available`,
      });
      return;
    }

    try {
      setPaymentStatus("creating_payment_session");
      setStatusMessage("Creating payment session...");

      // Use mobile network name in lowercase as provider
      const providerName = mobileNetwork.toLowerCase();

      // Create payment session first
      const paymentSessionPayload = selectedCountry === "KES" && paymentType === "PAYBILL" 
        ? {
            payer: account.address.toString(),
            provider: providerName,
            receiver_id: phoneNumber, // This is the paybill number
            account_identity: accountNumber, // This is the account number
            token: selectedBalance.currency.address!,
          }
        : {
            payer: account.address.toString(),
            provider: providerName,
            receiver_id: phoneNumber,
            token: selectedBalance.currency.address!,
            is_buy_goods: paymentType === "BUY_GOODS" // true for BUY_GOODS, false for MOBILE
          };

      const paymentSession = await createPaymentSession(paymentSessionPayload);

      // console.log("Payment session created:", paymentSession);

      // Only create payment method if we don't have an existing one and it's not a paybill payment
      if (!isPaybill && !selectedPaymentMethodId) {
        setPaymentStatus("creating_payment_method");
        setStatusMessage("Creating payment method...");

        const paymentMethod = await addPaymentMethod({
          owner: account.address.toString(),
          payment_method_type: "mobile-money",
          identity: phoneNumber,
          provider_id: mobileNetwork.toLowerCase(),
        });

        // console.log("Payment method created:", paymentMethod);
      } else if (!isPaybill && selectedPaymentMethodId) {
        console.log("Using existing payment method:", selectedPaymentMethodId);
      } else {
        console.log("Paybill payment - skipping payment method creation");
      }

      setPaymentStatus("depositing_to_contract");
      setStatusMessage("Depositing funds to smart contract...");

      // Calculate the exact asset amount shown to user and convert to octas
      const assetAmountNeeded = calculateAssetAmount(amount);
      const decimals = selectedBalance.currency.decimals || 8;
      const amountInOctas = convertToOctas(
        assetAmountNeeded,
        decimals
      );
      
      console.log("Sending to contract:", {
        assetAmountNeeded: assetAmountNeeded.toFixed(6),
        amountInOctas,
        decimals,
        address: selectedBalance.currency.address,
      });

      // Use gas-sponsored transaction
      await depositFungibleToContractSponsored(
        signTransaction,
        submitTransaction,
        account.address.toString(),
        amountInOctas,
        selectedBalance.currency.address!,
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
                
                // Check if payment is completed (handle both uppercase and lowercase)
                if (statusResponse.status === "Completed" || statusResponse.status === "completed" ||
                    statusResponse.status === "Success" || statusResponse.status === "success") {
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
            variant: "success",
            title: "Success",
            description: `Payment completed successfully! Receipt: ${finalStatus.data?.receipt || 'N/A'}`,
          });
          
          // Clear form after successful payment
          setTimeout(() => {
            clearForm();
          }, 3000); // Wait 3 seconds to let user see the success message
        } catch (statusError) {
          console.error("Error checking payment status:", statusError);
          // Check if this is a timeout error specifically
          if (statusError instanceof Error && statusError.message.includes("timeout")) {
            setPaymentStatus("error");
            setStatusMessage("Payment status check timed out - please verify manually");
            toast({
              variant: "destructive",
              title: "Payment Status Unknown",
              description: "Unable to verify payment status. Please check your transaction manually or contact support.",
            });
            
            // Clear the timeout message after 10 seconds
            setTimeout(() => {
              setPaymentStatus("idle");
              setStatusMessage("");
            }, 5000);
          } else {
            // For other errors, still mark as success since the contract transaction succeeded
            setPaymentStatus("success");
            setStatusMessage("Payment processed successfully! (Status check failed)");
            toast({
              variant: "success",
              title: "Success", 
              description: "Payment completed successfully! Status check failed but transaction succeeded.",
            });
            
            // Clear form after successful payment
            setTimeout(() => {
              clearForm();
            }, 3000);
          }
        }
      } else {
        setPaymentStatus("success");
        setStatusMessage("Payment processed successfully!");
        toast({
          variant: "success",
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
      {/* Header with Pay label and Cryptocurrency Selection */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Pay</h3>

        {/* Cryptocurrency Selection */}
        <div>
          {isLoadingSupportedCurrencies ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 backdrop-blur-md border border-white/20 rounded text-sm">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-400">Loading...</span>
            </div>
          ) : isSupportedCurrenciesError ? (
            <div className="flex items-center justify-between px-3 py-2 bg-red-500/10 border border-red-500/20 rounded text-sm">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-red-400">Failed to load</span>
              </div>
              <Button
                onClick={() => refetchSupportedCurrencies()}
                variant="outline"
                size="sm"
                className="text-xs h-6 px-2"
              >
                Retry
              </Button>
            </div>
          ) : cryptoCurrencies.length === 0 ? (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
              No cryptocurrencies found
            </div>
          ) : (
            <Select
              value={selectedCryptoCurrency?.id || ""}
              onValueChange={(value) => {
                const currency = cryptoCurrencies.find((c) => c.id === value);
                setSelectedCryptoCurrency(currency || null);
              }}
            >
              <SelectTrigger className="min-w-[120px] bg-white/5 backdrop-blur-md border-white/20 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all duration-200 shadow-lg">
                <div className="flex items-center gap-2">
                  {selectedCryptoCurrency ? (
                    <>
                      {selectedCryptoCurrency.symbol === "APT" ? (
                        <Image
                          src="/images/aptos-new.png"
                          alt="APT"
                          className="w-5 h-5 rounded-full"
                          width={20}
                          height={20}
                        />
                      ) : selectedCryptoCurrency.symbol === "USDC" ? (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                          $
                        </div>
                      ) : selectedCryptoCurrency.symbol === "USDT" || selectedCryptoCurrency.symbol === "USDt" ? (
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                          T
                        </div>
                      ) : selectedCryptoCurrency.symbol === "WBTC" ? (
                        <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                          ₿
                        </div>
                      ) : selectedCryptoCurrency.symbol === "xBTC" ? (
                        <div className="w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center text-xs text-white font-bold">
                          x₿
                        </div>
                      ) : (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white">
                          {selectedCryptoCurrency.symbol.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium">
                        {selectedCryptoCurrency.symbol}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-400">Select Cryptocurrency</span>
                  )}
                </div>
              </SelectTrigger>
              <SelectContent
                position="popper"
                sideOffset={4}
                className="z-[100003] bg-black/90 border-white/10 max-h-60 overflow-y-auto"
              >
                {cryptoCurrencies.map((currency) => (
                  <SelectItem
                    key={currency.id}
                    value={currency.id}
                    className="text-white"
                  >
                    <div className="flex items-center gap-2">
                      {currency.symbol === "APT" ? (
                        <Image
                          src="/images/aptos-apt-logo.png"
                          alt="APT"
                          className="w-5 h-5 rounded-full"
                          width={20}
                          height={20}
                        />
                      ) : currency.symbol === "USDC" ? (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                          $
                        </div>
                      ) : currency.symbol === "USDT" || currency.symbol === "USDt" ? (
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                          T
                        </div>
                      ) : currency.symbol === "WBTC" ? (
                        <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                          ₿
                        </div>
                      ) : currency.symbol === "xBTC" ? (
                        <div className="w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center text-xs text-white font-bold">
                          x₿
                        </div>
                      ) : (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white">
                          {currency.symbol.charAt(0)}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium">{currency.symbol}</span>
                        <span className="text-xs text-gray-400">{currency.name}</span>
                      </div>
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
            <TabsList className="grid w-full grid-cols-3 bg-white/5 backdrop-blur-md">
              <TabsTrigger
                value="MOBILE"
                className="data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:rounded-lg text-gray-400 hover:text-white text-xs font-normal"
              >
                Mobile Number
              </TabsTrigger>
              <TabsTrigger
                value="PAYBILL"
                className="data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:rounded-lg text-gray-400 hover:text-white text-xs font-normal"
              >
                Paybill
              </TabsTrigger>
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
          {isPaybill ? (
            // For paybill, show direct input without payment method selection
            <Input
              id="phone"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                // Clear any selected payment method when user types directly
                setSelectedPaymentMethodId(null);
              }}
              placeholder="123456"
              className="bg-white/5 backdrop-blur-md border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all duration-200 shadow-lg"
            />
          ) : (
            // For other payment types, show payment method selection
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
                      : "890123" // Till number
                    : "0712345678"
                }
                className="bg-white/5 backdrop-blur-md border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all duration-200 shadow-lg flex-1"
              />
            </div>
          )}
          {!isPaybill && selectedPaymentMethodId && (
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
              className="bg-primary/5 px-2 rounded-xl  text-right text-4xl font-bold text-white placeholder:text-gray-500 focus:ring-0 focus:outline-none w-48 md:w-56 py-1 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
            />
          </div>

          {/* Amount validation errors */}
          {parseFloat(amount || "0") > 0 && parseFloat(amount || "0") < 20 && (
            <div className="text-sm text-red-400 mb-4">
              Minimum amount is 20 {currentCountry?.currency || selectedCountry}
            </div>
          )}
          {parseFloat(amount || "0") >= 20 &&
            selectedBalance &&
            !hasSufficientBalance() && (
              <div className="text-sm text-red-400 mb-4">
                Insufficient balance for this amount
              </div>
            )}

          {/* You'll pay section */}
          {parseFloat(amount || "0") > 0 && selectedCryptoCurrency && (exchangeRate || conversionData) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">You&apos;ll pay</span>
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
                        {selectedCryptoCurrency && selectedCryptoCurrency.symbol === "APT" ? (
                          <Image
                            src="/images/aptos-new.png"
                            alt="APT"
                            className="w-4 h-4 rounded-full"
                            width={16}
                            height={16}
                          />
                        ) : selectedCryptoCurrency && selectedCryptoCurrency.symbol === "USDC" ? (
                          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                            $
                          </div>
                        ) : selectedCryptoCurrency && (selectedCryptoCurrency.symbol === "USDT" || selectedCryptoCurrency.symbol === "USDt") ? (
                          <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                            T
                          </div>
                        ) : selectedCryptoCurrency && selectedCryptoCurrency.symbol === "WBTC" ? (
                          <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                            ₿
                          </div>
                        ) : selectedCryptoCurrency && selectedCryptoCurrency.symbol === "xBTC" ? (
                          <div className="w-4 h-4 bg-orange-600 rounded-full flex items-center justify-center text-xs text-white font-bold">
                            x₿
                          </div>
                        ) : (
                          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white">
                            {(selectedCryptoCurrency?.symbol || '?').charAt(0)}
                          </div>
                        )}
                        <span className="text-gray-300">
                          {selectedCryptoCurrency?.symbol || 'Unknown'}
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
                      1 {selectedCryptoCurrency?.symbol} = {(conversionData.to_usd_quote).toFixed(2)} USD
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
                  {selectedBalance ? selectedBalance.balance.formatted : '0'}{" "}
                  {selectedCryptoCurrency?.symbol || 'Unknown'}
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
          <div className={`p-3 rounded text-sm ${
            statusMessage.includes("Receipt:")
              ? "bg-green-500/10 border border-green-500/20"
              : paymentStatus === "error" || statusMessage.includes("timed out")
                ? "bg-red-500/10 border border-red-500/20"
                : "bg-primary/10 border border-primary/20"
          }`}>
            <div className="flex items-center gap-2">
              {isProcessing && (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
              <span className={
                statusMessage.includes("Receipt:")
                  ? "text-green-400"
                  : paymentStatus === "error" || statusMessage.includes("timed out")
                    ? "text-red-400"
                    : "text-primary"
              }>
                {statusMessage}
              </span>
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
            !selectedBalance ||
            availableCryptoBalances.length === 0 ||
            parseFloat(amount || "0") <= 0 ||
            parseFloat(amount || "0") < 20 ||
            !exchangeRate ||
            isLoadingExchangeRate ||
            (parseFloat(amount || "0") >= 20 && !hasSufficientBalance()) ||
            isAccountNumberRequired
          }
          variant="primary"
          className="w-full"
        >
          {isProcessing
            ? "Processing..."
            : parseFloat(amount || "0") > 0 && parseFloat(amount || "0") < 20
              ? "Minimum amount is 20"
              : parseFloat(amount || "0") >= 20 &&
                selectedBalance &&
                !hasSufficientBalance()
                ? "Insufficient Balance"
                : isAccountNumberRequired
                  ? "Enter account number"
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
