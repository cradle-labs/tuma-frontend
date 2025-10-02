"use client";

import React from "react";
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
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { useProviders } from "@/hooks/useProviders";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

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
  const { status, error, isLoading, paymentStatus, startOnramp, reset } = useOnramp();
  const { providers, isLoading: isLoadingProviders, isError: isProvidersError, error: providersError, getProvidersByCountry, getCountries, refetch: refetchProviders } = useProviders();
  
  const countries = getCountries();
  const currentCountry = countries.find(c => c.code === selectedCountry);
  const availableProviders = getProvidersByCountry(selectedCountry);
  const { exchangeRate, isLoadingExchangeRate, isUsingFallback } = useExchangeRate(currentCountry?.currency || selectedCountry);

  // APT price in USD (same as PayForm)
  const APT_PRICE_USD = 8.5;

  // Calculate APT amount from local currency
  const calculateAPTAmount = (fiatAmount: string): number => {
    if (!exchangeRate || !fiatAmount) return 0;
    const fiatValue = parseFloat(fiatAmount);
    const usdValue = fiatValue / exchangeRate; // Convert fiat to USD
    const aptAmount = usdValue / APT_PRICE_USD; // Convert USD to APT
    return aptAmount;
  };

  const handleSubmit = async () => {
    if (!amount || !phoneNumber || !mobileNetwork) return;
    
    await startOnramp({
      phoneNumber,
      mobileNetwork,
      amount: parseFloat(amount),
    });
  };

  const getStatusMessage = () => {
    switch (status) {
      case "adding_payment_method":
        return "Adding payment method...";
      case "initiating_onramp":
        return "Initiating onramp...";
      case "monitoring_payment":
        return "Processing payment...";
      case "success":
        return "Payment successful!";
      case "error":
        return `Error: ${error}`;
      default:
        return null;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "adding_payment_method":
      case "initiating_onramp":
      case "monitoring_payment":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const isFormDisabled = !connected || isLoading || status === "success";
  const isButtonDisabled = isFormDisabled || !amount || !phoneNumber || !mobileNetwork;

  return (
    <div className="space-y-4 mt-6">
      {!connected && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-400">Please connect your wallet to proceed</p>
        </div>
      )}

      {status !== "idle" && (
        <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm text-white">{getStatusMessage()}</span>
          </div>
          {paymentStatus && (
            <div className="mt-2 text-xs text-gray-400">
              Status: {paymentStatus.status}
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

      {/* Country Selection */}
      <div>
        <Label htmlFor="country-select" className="text-sm text-gray-400 pb-2">
          Select Country
        </Label>
        {isLoadingProviders ? (
          <div className="p-3 bg-white/5 border border-white/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
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

      <div className="space-y-2">
        <Label htmlFor="mobile-network" className="text-sm text-gray-400">Mobile Network</Label>
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
        ) : availableProviders.length === 0 ? (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <span className="text-sm text-red-400">No networks available for this country</span>
          </div>
        ) : (
          <Select value={mobileNetwork} onValueChange={setMobileNetwork} disabled={isFormDisabled}>
            <SelectTrigger className="bg-white/5 backdrop-blur-md border-white/20 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all duration-200 shadow-lg">
              <SelectValue placeholder="Select network" />
            </SelectTrigger>
            <SelectContent className="bg-black/90 border-white/10">
              {availableProviders.map((provider) => (
                <SelectItem key={provider.id} value={provider.name} className="text-white">
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone-number" className="text-sm text-gray-400">M-Pesa Phone Number</Label>
        <Input
          id="phone-number"
          type="tel"
          placeholder="0799770833"
          value={phoneNumber}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setPhoneNumber(e.target.value)
          }
          disabled={isFormDisabled}
          className="bg-white/5 backdrop-blur-md border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all duration-200 shadow-lg"
        />
      </div>
      
      <div className="space-y-4">
        <Label className="text-sm text-gray-400">Enter Amount in {currentCountry?.currency || selectedCountry}</Label>
        
        <div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-lg p-4">
          {/* Amount Input */}
          <div className="flex items-center justify-between pb-4">
            <span className="text-3xl font-bold text-white">{currentCountry?.currency || selectedCountry}</span>
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
                <span className="text-sm text-gray-400">You'll receive</span>
                <div className="flex items-center gap-1">
                  <img
                    src="/images/aptos-new.png"
                    alt="APT"
                    className="w-4 h-4 rounded-full"
                  />
                  <span className="text-gray-300">APT</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-white">
                  {isLoadingExchangeRate ? (
                    "Loading..."
                  ) : exchangeRate ? (
                    `≈ ${calculateAPTAmount(amount).toFixed(4)} APT`
                  ) : (
                    "Rate unavailable"
                  )}
                </span>
                <div className="text-xs text-gray-500">
                  {isLoadingExchangeRate ? (
                    "Loading rate..."
                  ) : exchangeRate ? (
                    `1 USD = ${exchangeRate} ${currentCountry?.currency || selectedCountry}${isUsingFallback ? " (estimated)" : ""}`
                  ) : (
                    "Rate unavailable"
                  )}
                </div>
              </div>

              {/* Summary section */}
              <div className="border-t border-gray-700 pt-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Total {currentCountry?.currency || selectedCountry}</span>
                  <span className="text-white font-semibold">{amount || "0.00"} {currentCountry?.currency || selectedCountry}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Amount in USD</span>
                  <span className="text-white font-semibold">
                    {isLoadingExchangeRate ? (
                      "Loading..."
                    ) : exchangeRate ? (
                      `${(parseFloat(amount || "0") / exchangeRate).toFixed(2)} USD`
                    ) : (
                      "Rate unavailable"
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Estimated APT</span>
                  <span className="text-white font-semibold">
                    {isLoadingExchangeRate ? (
                      "Loading..."
                    ) : exchangeRate ? (
                      `${calculateAPTAmount(amount).toFixed(4)} APT`
                    ) : (
                      "Rate unavailable"
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
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
          "Buy APT"
        )}
      </Button>

      <p className="text-xs text-gray-400 text-center">
        Minimum: 20 KES • Maximum: 250,000 KES
      </p>
    </div>
  );
}