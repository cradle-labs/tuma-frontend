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
  const [recipientMode, setRecipientMode] = useState<"crypto" | "cash">(
    "crypto"
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
    <form onSubmit={() => {}} className="space-y-4">
      <div>
        <Tabs
          value={recipientMode}
          onValueChange={(v) => setRecipientMode(v as "crypto" | "cash")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cash">Pay</TabsTrigger>

            <TabsTrigger value="deposit">Deposit</TabsTrigger>
          </TabsList>
          <TabsContent value="deposit" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mobile-network">Mobile Network</Label>
              <Select value={mobileNetwork} onValueChange={setMobileNetwork}>
                <SelectTrigger>
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Safaricom">Safaricom (M-Pesa)</SelectItem>
                  <SelectItem value="Airtel">Airtel Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="onramp-amount">Amount (KES)</Label>
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
              />
              {/* {exchangeRate && onrampAmount && (
                  <p className="text-sm text-gray-500">
                    You will receive: {usdcEquivalent} USDC
                    {exchangeRateLoading && " (calculating...)"}
                  </p>
                )} */}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone-number">M-Pesa Phone Number</Label>
              <Input
                id="phone-number"
                type="tel"
                placeholder="0799770833"
                value={phoneNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPhoneNumber(e.target.value)
                }
              />
            </div>

            <Button
              className="w-full"
              variant="default"
              onClick={() => {}}
              disabled={!amount || !phoneNumber || !mobileNetwork}
            >
              Buy USDC
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Minimum: 100 KES • Maximum: 250,000 KES
            </p>
          </TabsContent>
          <TabsContent value="cash" className="space-y-3">
            {/* Country Selection - Only for fiat payments */}
            <div>
              <Label htmlFor="country-select" className="pb-2">
                Select Country
              </Label>
              <Select
                value={selectedCountry}
                onValueChange={(value) =>
                  setSelectedCountry(value as typeof selectedCountry)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a country" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  sideOffset={4}
                  className="z-[100003]"
                >
                  {Object.entries(COUNTRIES).map(([code, country]) => (
                    <SelectItem key={code} value={code}>
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
                  <Label>Payment Type</Label>
                  <Select
                    value={paymentType}
                    onValueChange={(
                      value: "MOBILE" | "PAYBILL" | "BUY_GOODS"
                    ) => setPaymentType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      sideOffset={4}
                      className="z-[100003]"
                    >
                      <SelectItem value="MOBILE">Mobile Number</SelectItem>
                      <SelectItem value="PAYBILL">Paybill</SelectItem>
                      <SelectItem value="BUY_GOODS">Buy Goods</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Mobile Network - For all mobile money countries */}
              {availableNetworks.length > 0 && (
                <div className="space-y-2">
                  <Label>Mobile Network</Label>
                  <Select
                    value={mobileNetwork}
                    onValueChange={setMobileNetwork}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      sideOffset={4}
                      className="z-[100003]"
                    >
                      {availableNetworks.map((network) => (
                        <SelectItem key={network} value={network}>
                          {network}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Phone/Shortcode field - For all mobile money countries */}
            <div className="space-y-2">
              <Label htmlFor="phone">
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
                />
                {isValidating && (
                  <div className="text-sm text-blue-600">
                    Validating number...
                  </div>
                )}
              </div>
              {validationResult && (
                <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                  {(validationResult as { data?: { public_name?: string } })
                    ?.data?.public_name || "Valid recipient"}
                </div>
              )}
              <div className="text-sm text-muted-foreground">
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
                <Label htmlFor="paybill-account-number">Account Number</Label>
                <Input
                  id="paybill-account-number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter account number"
                  required={paymentType === "PAYBILL"}
                />
                <div className="text-sm text-muted-foreground">
                  Enter the account number for this paybill
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="submit"
                disabled={
                  !amount ||
                  (!recipient && !phoneNumber) ||
                  (selectedCountry === "KES" &&
                    paymentType === "PAYBILL" &&
                    !accountNumber) ||
                  !mobileNetwork                 }
                variant="default"
              >
                pay
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </form>
  );

  return (
    <>
      {showWrapper ? (
        <Card className="w-full py-6">
          <CardContent>{formContent}</CardContent>
        </Card>
      ) : (
        formContent
      )}
    </>
  );
}
