"use client";

import React, { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebouncedValidation } from "@/hooks/useDebouncedValidation";
import { DepositForm } from "./DepositForm";
import { PayForm } from "./PayForm";

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
  const [payPhoneNumber, setPayPhoneNumber] = useState("");
  const [depositPhoneNumber, setDepositPhoneNumber] = useState("");
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
 

  // Use TanStack Query for phone number validation - only for Pay tab
  const { isValidating, validationResult, clearValidation } =
    useDebouncedValidation({
      phoneNumber: payPhoneNumber,
      paymentType,
      mobileNetwork: mobileNetwork || "Safaricom", // Fallback to avoid empty string
      enabled: recipientMode === "offramp" && payPhoneNumber.length >= 10 && mobileNetwork !== "",
    });

  // Clear validation when phone number changes significantly
  React.useEffect(() => {
    if (payPhoneNumber.length < 10) {
      clearValidation();
    }
  }, [payPhoneNumber, clearValidation]);

  // Clear account number when payment type is not PAYBILL
  React.useEffect(() => {
    if (paymentType !== "PAYBILL") {
      setAccountNumber("");
    }
  }, [paymentType]);

  // Reset relevant fields when country changes
  React.useEffect(() => {
    setPayPhoneNumber("");
    setDepositPhoneNumber("");
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

  const availableNetworks = MOBILE_NETWORKS[selectedCountry];

  // Memoize setter functions to prevent unnecessary re-renders
  const handleSetPayPhoneNumber = useCallback((value: string) => setPayPhoneNumber(value), []);
  const handleSetAccountNumber = useCallback((value: string) => setAccountNumber(value), []);
  const handleSetPaymentType = useCallback((value: "MOBILE" | "PAYBILL" | "BUY_GOODS") => setPaymentType(value), []);
  const handleSetMobileNetwork = useCallback((value: string) => setMobileNetwork(value), []);
  const handleSetSelectedCountry = useCallback((value: "KES" | "UGX" | "GHS" | "CDF" | "ETB") => setSelectedCountry(value), []);

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
            
            <TabsContent value="deposit">
              <DepositForm
                amount={amount}
                setAmount={setAmount}
                phoneNumber={depositPhoneNumber}
                setPhoneNumber={setDepositPhoneNumber}
                mobileNetwork={mobileNetwork}
                setMobileNetwork={setMobileNetwork}
              />
            </TabsContent>
            
            <TabsContent value="offramp">
              <PayForm
                phoneNumber={payPhoneNumber}
                setPhoneNumber={handleSetPayPhoneNumber}
                accountNumber={accountNumber}
                setAccountNumber={handleSetAccountNumber}
                paymentType={paymentType}
                setPaymentType={handleSetPaymentType}
                mobileNetwork={mobileNetwork}
                setMobileNetwork={handleSetMobileNetwork}
                selectedCountry={selectedCountry}
                setSelectedCountry={handleSetSelectedCountry}
                isValidating={isValidating}
                validationResult={validationResult}
              />
            </TabsContent>
          </Tabs>
        </div>
      </form>
    </div>
  );

  return formContent;
}
