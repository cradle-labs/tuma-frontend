"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebouncedValidation } from "@/hooks/useDebouncedValidation";
import { ArrowUpDown, Info, BarChart3, FileText, Settings, ArrowLeftRight } from "lucide-react";


// Country configuration
const COUNTRIES = {
  KES: { name: "Kenya", currency: "KES", symbol: "KES" },
  UGX: { name: "Uganda", currency: "UGX", symbol: "UGX" },
  GHS: { name: "Ghana", currency: "GHS", symbol: "GHS" },
  CDF: { name: "DR Congo", currency: "CDF", symbol: "CDF" },
  ETB: { name: "Ethiopia", currency: "ETB", symbol: "ETB" },
} as const;

// Mobile networks by country
const MOBILE_NETWORKS = {
  KES: ["Safaricom", "Airtel"],
  UGX: ["MTN", "Airtel"],
  GHS: ["MTN", "AirtelTigo"],
  CDF: ["Airtel Money", "Orange Money"],
  ETB: ["Telebirr", "Cbe Birr"],
} as const;

export function Payment() {
  const showWrapper = true;
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [recipientMode, setRecipientMode] = useState<"offramp" | "deposit">(
    "offramp"
  );
  const [paymentType, setPaymentType] = useState<
    "MOBILE" | "PAYBILL" | "BUY_GOODS"
  >("MOBILE");
  const [mobileNetwork, setMobileNetwork] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<
    "KES" | "UGX" | "GHS" | "CDF" | "ETB"
  >("KES");
 

  // Use TanStack Query for phone number validation
  const { isValidating, validationResult, clearValidation } =
    useDebouncedValidation({
      phoneNumber,
      paymentType,
      mobileNetwork: mobileNetwork || "Safaricom", // Fallback to avoid empty string
      enabled: phoneNumber.length >= 10 && mobileNetwork !== "",
    });

  // Clear validation when phone number changes significantly
  React.useEffect(() => {
    if (phoneNumber.length < 10) {
      clearValidation();
    }
  }, [phoneNumber]);

  // Clear account number when payment type is not PAYBILL
  React.useEffect(() => {
    if (paymentType !== "PAYBILL") {
      setAccountNumber("");
    }
  }, [paymentType]);

  // Reset relevant fields when country changes
  React.useEffect(() => {
    setPhoneNumber("");
    setAccountNumber("");
    setMobileNetwork("");

    // Set default payment type
    setPaymentType("MOBILE");

    // Set default mobile network if available
    const networks = MOBILE_NETWORKS[selectedCountry];
    if (networks.length > 0) {
      setMobileNetwork(networks[0] as string);
    }
  }, [selectedCountry]);

  // For crypto payments, amount is in USDC. For cash payments, amount is in local currency

  const currentCountry = COUNTRIES[selectedCountry];
  const availableNetworks = MOBILE_NETWORKS[selectedCountry];

  const formContent = (
    <div className="w-full max-w-md mx-auto bg-transparent backdrop-blur-sm rounded-2xl border border-white/10 p-6">
      <form onSubmit={() => {}} className="space-y-4">
        <div>
          <Tabs
            value={recipientMode}
            onValueChange={(v) => setRecipientMode(v as "offramp" | "deposit")}
            className="w-full"
            defaultValue="offramp"
          >
            {/* Styled like exchange interface tabs */}
            <TabsList  className="grid w-full grid-cols-2 bg-white/5 backdrop-blur-md rounded-xl p-1 ">
              <TabsTrigger 
                value="offramp" 
                className="data-[state=active]:bg-primary data-[state=active]:text-black text-gray-400 hover:text-white rounded-xl"
              >
                Pay
              </TabsTrigger>
              <TabsTrigger 
                value="deposit"
                className="data-[state=active]:bg-primary data-[state=active]:text-black text-gray-400 hover:text-white rounded-xl"
              >
                Deposit
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="deposit" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="mobile-network" className="text-sm text-gray-400">Mobile Network</Label>
                <Select value={mobileNetwork} onValueChange={setMobileNetwork}>
                  <SelectTrigger className="bg-white/5 backdrop-blur-md border-white/20 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all duration-200 shadow-lg">
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-white/10">
                    <SelectItem value="Safaricom">Safaricom (M-Pesa)</SelectItem>
                    <SelectItem value="Airtel">Airtel Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="onramp-amount" className="text-sm text-gray-400">Amount (KES)</Label>
                <Input
                  id="onramp-amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAmount(e.target.value)
                  }
                  step="0.01"
                  min="20"
                  max="250000"
                  className="bg-white/5 backdrop-blur-md border-white/20 text-white placeholder:text-gray-400 text-2xl font-semibold focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all duration-200 shadow-lg"
                />
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
                  className="bg-white/5 backdrop-blur-md border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all duration-200 shadow-lg"
                />
              </div>

              <Button
                className="w-full"
                variant="primary"
                onClick={() => {}}
                // disabled={!amount || !phoneNumber || !mobileNetwork}
              >
                Buy USDC
              </Button>

              <p className="text-xs text-gray-400 text-center">
                Minimum: 100 KES • Maximum: 250,000 KES
              </p>
            </TabsContent>
            
            <TabsContent value="offramp" className="space-y-3 mt-6">
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
                    <SelectValue placeholder="Choose a country" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    sideOffset={4}
                    className="z-[100003] bg-black/90 border-white/10"
                  >
                    {Object.entries(COUNTRIES).map(([code, country]) => (
                      <SelectItem key={code} value={code} className="text-white">
                        {country.name} ({country.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between items-center pt-4">
                {/* Payment Type - Only for Kenya */}
                {selectedCountry === "KES" && (
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-400">Payment Type</Label>
                    <Select
                      value={paymentType}
                      onValueChange={(
                        value: "MOBILE" | "PAYBILL" | "BUY_GOODS"
                      ) => setPaymentType(value)}
                    >
                      <SelectTrigger className="bg-white/5 backdrop-blur-md border-white/20 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all duration-200 shadow-lg">
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        sideOffset={4}
                        className="z-[100003] bg-black/90 border-white/10"
                      >
                        <SelectItem value="MOBILE" className="text-white">Mobile Number</SelectItem>
                        <SelectItem value="PAYBILL" className="text-white">Paybill</SelectItem>
                        <SelectItem value="BUY_GOODS" className="text-white">Buy Goods</SelectItem>
                      </SelectContent>
                    </Select>
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
              </div>

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
                <div className="text-sm text-gray-400">
                  Enter the{" "}
                  {selectedCountry === "KES"
                    ? paymentType.toLowerCase()
                    : "phone"}{" "}
                  number to send {currentCountry.currency} to
                </div>
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
              
              <div className="flex justify-end gap-2">
                <Button
                  type="submit"
                  // disabled={}
                  variant="primary"
                  className="w-full"
                >
                  Pay
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </form>
    </div>
  );

  return formContent;
}
