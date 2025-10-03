"use client";

import React, { useMemo, useCallback, useState } from "react";
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
import { useOnramp } from "@/hooks/useOnramp";
import { useProviders } from "@/hooks/useProviders";
import { useConversion } from "@/hooks/useConversion";
import {
  useSupportedCurrencies,
  SupportedCurrency,
} from "@/hooks/useSupportedCurrencies";
import { useCryptoBalances } from "@/hooks/useCryptoBalances";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Loader2, CheckCircle, XCircle, CreditCard } from "lucide-react";
import { PaymentMethodDialog } from "./PaymentMethodDialog";

interface DepositFormProps {
  amount: string;
  setAmount: (amount: string) => void;
  phoneNumber: string;
  setPhoneNumber: (phoneNumber: string) => void;
  mobileNetwork: string;
  setMobileNetwork: (network: string) => void;
  selectedCountry: "KES" | "UGX" | "GHS" | "CDF" | "ETB";
  setSelectedCountry: (country: "KES" | "UGX" | "GHS" | "CDF" | "ETB") => void;
}

export function DepositForm({
  amount,
  setAmount,
  phoneNumber,
  setPhoneNumber,
  mobileNetwork,
  setMobileNetwork,
  selectedCountry,
  setSelectedCountry,
}: DepositFormProps) {
  const { connected } = useWallet();
  const { status, error, isLoading, paymentStatus, startOnramp, reset } =
    useOnramp();
  const {
    providers,
    isLoading: isLoadingProviders,
    isError: isProvidersError,
    error: providersError,
    getProvidersByCountry,
    getCountries,
    refetch: refetchProviders,
  } = useProviders();
  const {
    cryptoCurrencies,
    isLoading: isLoadingSupportedCurrencies,
    isError: isSupportedCurrenciesError,
    error: supportedCurrenciesError,
    refetch: refetchSupportedCurrencies,
  } = useSupportedCurrencies();
  const {
    cryptoBalances,
    isLoading: isLoadingBalances,
    getBalanceById,
    hasSufficientBalance: checkSufficientBalance,
  } = useCryptoBalances();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    string | null
  >(null);
  const [selectedCryptoCurrency, setSelectedCryptoCurrency] =
    useState<SupportedCurrency | null>(null);

  const countries = getCountries();
  const currentCountry = countries.find((c) => c.code === selectedCountry);
  const availableProviders = getProvidersByCountry(selectedCountry);

  // Auto-select the first available cryptocurrency if none is selected
  React.useEffect(() => {
    if (cryptoCurrencies.length > 0 && !selectedCryptoCurrency) {
      // Try to find a cryptocurrency that has a balance > 0
      const cryptoWithBalance = cryptoCurrencies.find((crypto) => {
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

  // Auto-reset form when payment is completed
  React.useEffect(() => {
    if (status === "monitoring_payment" && 
        (paymentStatus?.status === "completed" || paymentStatus?.status === "Completed" || 
         paymentStatus?.status === "success" || paymentStatus?.status === "Success")) {
      // Clear form fields
      setAmount("");
      setPhoneNumber("");
      setMobileNetwork("");
      setSelectedPaymentMethodId(null);
      
      // Reset the onramp status after a short delay to show success message
      setTimeout(() => {
        reset();
      }, 2000);
    }
  }, [status, paymentStatus, setAmount, setPhoneNumber, setMobileNetwork, reset]);

  // Find the corresponding crypto balance when a cryptocurrency is selected
  const selectedBalance = useMemo(() => {
    if (!selectedCryptoCurrency) return null;

    // Find matching balance by currency ID
    const matchingBalance = getBalanceById(selectedCryptoCurrency.id);

    console.log(
      "Selected balance for",
      selectedCryptoCurrency.symbol,
      ":",
      matchingBalance
    );

    return matchingBalance || null;
  }, [selectedCryptoCurrency, getBalanceById]);

  // Use conversion API instead of manual calculation
  const conversionParams = useMemo(() => {
    const parsedAmount = parseFloat(amount);
    console.log("Amount entered:", amount, "Parsed amount:", parsedAmount);

    if (
      !amount ||
      isNaN(parsedAmount) ||
      parsedAmount <= 0 ||
      !selectedCryptoCurrency
    ) {
      console.log(
        "Conversion params set to null - invalid amount or no crypto selected"
      );
      return null;
    }

    const params = {
      from: (currentCountry?.currency || selectedCountry).toLowerCase(),
      to: selectedCryptoCurrency.id,
      amount: parsedAmount,
    };

    console.log("Conversion params created:", params);
    return params;
  }, [
    amount,
    currentCountry?.currency,
    selectedCountry,
    selectedCryptoCurrency,
  ]);

  const {
    data: conversionData,
    isLoading: isLoadingConversion,
    error: conversionError,
  } = useConversion(conversionParams);

  // Helper function to get USD amount from conversion data
  const getUSDAmount = useCallback((): number => {
    if (!conversionData || !amount) return 0;
    const fiatValue = parseFloat(amount);
    return fiatValue / conversionData.from_usd_quote;
  }, [conversionData, amount]);

  const handlePaymentMethodSelect = useCallback(
    (phoneNumber: string, paymentMethodId?: string) => {
      setPhoneNumber(phoneNumber);
      setSelectedPaymentMethodId(paymentMethodId || null);
    },
    [setPhoneNumber]
  );

  const handleCreateNewPaymentMethod = useCallback(() => {
    setSelectedPaymentMethodId(null);
    setPhoneNumber("");
  }, [setPhoneNumber]);

  const handleSubmit = async () => {
    if (!amount || !phoneNumber || !mobileNetwork || !selectedCryptoCurrency)
      return;

    await startOnramp({
      phoneNumber,
      mobileNetwork,
      amount: parseFloat(amount),
      existingPaymentMethodId: selectedPaymentMethodId,
      cryptoCurrencyId: selectedCryptoCurrency.id,
      cryptoCurrencyAddress: selectedCryptoCurrency.address,
    });
  };

  const getStatusMessage = useCallback(() => {
    switch (status) {
      case "adding_payment_method":
        return "Adding payment method...";
      case "initiating_onramp":
        return "Initiating onramp...";
      case "monitoring_payment":
        // Check if payment is actually completed
        if (paymentStatus?.status === "completed" || paymentStatus?.status === "Completed" || 
            paymentStatus?.status === "success" || paymentStatus?.status === "Success") {
          return "Payment completed successfully!";
        }
        return "Processing payment...";
      case "success":
        return "Payment successful!";
      case "error":
        return `Error: ${error}`;
      default:
        return null;
    }
  }, [status, error, paymentStatus]);

  const getStatusIcon = useCallback(() => {
    switch (status) {
      case "adding_payment_method":
      case "initiating_onramp":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "monitoring_payment":
        // Check if payment is actually completed
        if (paymentStatus?.status === "completed" || paymentStatus?.status === "Completed" || 
            paymentStatus?.status === "success" || paymentStatus?.status === "Success") {
          return <CheckCircle className="h-4 w-4 text-green-500" />;
        }
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  }, [status, paymentStatus]);

  const isFormDisabled = useMemo(
    () => !connected || isLoading || status === "success",
    [connected, isLoading, status]
  );
  const isButtonDisabled = useMemo(
    () =>
      isFormDisabled ||
      !amount ||
      !phoneNumber ||
      !mobileNetwork ||
      !selectedCryptoCurrency,
    [isFormDisabled, amount, phoneNumber, mobileNetwork, selectedCryptoCurrency]
  );

  return (
    <div className="space-y-4 mt-6">
      {/* Header with Fund wallet label and Cryptocurrency Selection */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Fund wallet</h3>

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
                        <img
                          src="/images/aptos-new.png"
                          alt="APT"
                          className="w-5 h-5 rounded-full"
                        />
                      ) : selectedCryptoCurrency.symbol === "USDC" ? (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                          $
                        </div>
                      ) : selectedCryptoCurrency.symbol === "USDT" ||
                        selectedCryptoCurrency.symbol === "USDt" ? (
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
                        <img
                          src="/images/aptos-apt-logo.png"
                          alt="APT"
                          className="w-5 h-5 rounded-full"
                        />
                      ) : currency.symbol === "USDC" ? (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                          $
                        </div>
                      ) : currency.symbol === "USDT" ||
                        currency.symbol === "USDt" ? (
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
                        <span className="text-xs text-gray-400">
                          {currency.name}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {!connected && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-400">
            Please connect your wallet to proceed
          </p>
        </div>
      )}

      {/* Country Selection */}
      <div>
        <Label htmlFor="country-select" className="text-sm text-gray-400 pb-2">
          Select Country
        </Label>
        {isLoadingProviders ? (
          <div className="p-3 bg-white/5 border border-white/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-400">
                Loading countries...
              </span>
            </div>
          </div>
        ) : isProvidersError ? (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-400">
                  Failed to load countries
                </span>
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
              {providersError?.message || "Unknown error"}
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
                <SelectItem
                  key={country.code}
                  value={country.code}
                  className="text-white"
                >
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

      <div className="space-y-2">
        <Label htmlFor="mobile-network" className="text-sm text-gray-400">
          Mobile Network
        </Label>
        {isLoadingProviders ? (
          <div className="p-3 bg-white/5 border border-white/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-400">Loading networks...</span>
            </div>
          </div>
        ) : isProvidersError ? (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-400">
                  Failed to load networks
                </span>
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
        ) : availableProviders.length === 0 ? (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <span className="text-sm text-red-400">
              No networks available for this country
            </span>
          </div>
        ) : (
          <Select
            value={mobileNetwork}
            onValueChange={setMobileNetwork}
            disabled={isFormDisabled}
          >
            <SelectTrigger className="bg-white/5 backdrop-blur-md border-white/20 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all duration-200 shadow-lg">
              <SelectValue placeholder="Select network" />
            </SelectTrigger>
            <SelectContent className="bg-black/90 border-white/10">
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
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone-number" className="text-sm text-gray-400">
          M-Pesa Phone Number
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsDialogOpen(true)}
            disabled={isFormDisabled}
            className="bg-white/5 backdrop-blur-md border-white/20 text-white hover:bg-primary hover:text-black focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 shadow-lg flex-shrink-0"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Select
          </Button>
          <Input
            id="phone-number"
            type="tel"
            placeholder="0799770833"
            value={phoneNumber}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPhoneNumber(e.target.value)
            }
            disabled={isFormDisabled}
            className="bg-white/5 backdrop-blur-md border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all duration-200 shadow-lg flex-1"
          />
        </div>
        {selectedPaymentMethodId && (
          <p className="text-xs text-green-400">✓ Ok</p>
        )}
      </div>

      <div className="space-y-4">
        <Label className="text-sm text-gray-400">
          Enter Amount in {currentCountry?.currency || selectedCountry}
        </Label>

        <div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-lg p-4">
          {/* Amount Input */}
          <div className="flex items-center justify-between pb-4">
            <span className="text-3xl font-bold text-white">
              {currentCountry?.currency || selectedCountry}
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="20"
              max="250000"
              step="0.01"
              disabled={isFormDisabled}
              className="bg-primary/5 px-2 rounded-xl text-right text-4xl font-bold text-white placeholder:text-gray-500 focus:ring-0 focus:outline-none w-56 py-1 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
            />
          </div>

          {/* You'll receive section */}
          {parseFloat(amount || "0") > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">You&apos;ll receive</span>
                <div className="flex items-center gap-1">
                  {selectedCryptoCurrency ? (
                    <>
                      {selectedCryptoCurrency.symbol === "APT" ? (
                        <img
                          src="/images/aptos-new.png"
                          alt="APT"
                          className="w-4 h-4 rounded-full"
                        />
                      ) : selectedCryptoCurrency.symbol === "USDC" ? (
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                          $
                        </div>
                      ) : selectedCryptoCurrency.symbol === "USDT" ||
                        selectedCryptoCurrency.symbol === "USDt" ? (
                        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                          T
                        </div>
                      ) : selectedCryptoCurrency.symbol === "WBTC" ? (
                        <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                          ₿
                        </div>
                      ) : selectedCryptoCurrency.symbol === "xBTC" ? (
                        <div className="w-4 h-4 bg-orange-600 rounded-full flex items-center justify-center text-xs text-white font-bold">
                          x₿
                        </div>
                      ) : (
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white">
                          {selectedCryptoCurrency.symbol.charAt(0)}
                        </div>
                      )}
                      <span className="text-gray-300">
                        {selectedCryptoCurrency.symbol}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-300">Select Currency</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-white">
                  {isLoadingConversion
                    ? "Loading..."
                    : conversionData
                      ? `≈ ${conversionData.converted.toFixed(4)} ${selectedCryptoCurrency?.symbol || "APT"}`
                      : conversionError
                        ? "Rate unavailable"
                        : "Enter amount"}
                </span>
                <div className="text-xs text-gray-500">
                  {isLoadingConversion
                    ? "Loading rate..."
                    : conversionData
                      ? `1 ${(currentCountry?.currency || selectedCountry).toUpperCase()} = ${conversionData.from_usd_quote} USD`
                      : conversionError
                        ? "Rate unavailable"
                        : "Enter amount"}
                </div>
              </div>

              {/* Summary section */}
              <div className="border-t border-gray-700 pt-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">
                    Total {currentCountry?.currency || selectedCountry}
                  </span>
                  <span className="text-white font-semibold">
                    {amount || "0.00"}{" "}
                    {currentCountry?.currency || selectedCountry}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Amount in USD</span>
                  <span className="text-white font-semibold">
                    {isLoadingConversion
                      ? "Loading..."
                      : conversionData
                        ? `${getUSDAmount().toFixed(2)} USD`
                        : "Rate unavailable"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">
                    Estimated {selectedCryptoCurrency?.symbol || "APT"}
                  </span>
                  <span className="text-white font-semibold">
                    {isLoadingConversion
                      ? "Loading..."
                      : conversionData
                        ? `${conversionData.converted.toFixed(4)} ${selectedCryptoCurrency?.symbol || "APT"}`
                        : "Rate unavailable"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        {status !== "idle" && (
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className="text-sm text-white">{getStatusMessage()}</span>
              </div>
              {paymentStatus && (
                <div className="mt-2 text-xs text-gray-400">
                  Status: {(paymentStatus as any)?.status || "Unknown"}
                </div>
              )}
              {(status === "error" || status === "success") && (
                <Button
                  onClick={reset}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Start New Transaction
                </Button>
              )}
            </div>
          )}
      </div>

      <Button
        className="w-full"
        variant="primary"
        onClick={handleSubmit}
        disabled={isButtonDisabled}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Processing...
          </>
        ) : (
          `Buy ${selectedCryptoCurrency?.symbol || "Crypto"}`
        )}
      </Button>

      <p className="text-xs text-gray-400 text-center">
        Minimum: 20 KES • Maximum: 250,000 KES
      </p>

      <PaymentMethodDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSelect={handlePaymentMethodSelect}
        onCreateNew={handleCreateNewPaymentMethod}
      />
    </div>
  );
}
