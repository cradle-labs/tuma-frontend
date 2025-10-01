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
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

interface DepositFormProps {
  amount: string;
  setAmount: (amount: string) => void;
  phoneNumber: string;
  setPhoneNumber: (phoneNumber: string) => void;
  mobileNetwork: string;
  setMobileNetwork: (network: string) => void;
}

export function DepositForm({
  amount,
  setAmount,
  phoneNumber,
  setPhoneNumber,
  mobileNetwork,
  setMobileNetwork,
}: DepositFormProps) {
  const { connected } = useWallet();
  const { status, error, isLoading, paymentStatus, startOnramp, reset } = useOnramp();

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

      <div className="space-y-2">
        <Label htmlFor="mobile-network" className="text-sm text-gray-400">Mobile Network</Label>
        <Select value={mobileNetwork} onValueChange={setMobileNetwork} disabled={isFormDisabled}>
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
          disabled={isFormDisabled}
          className="bg-white/5 backdrop-blur-md border-white/20 text-white placeholder:text-gray-400 text-2xl font-semibold focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all duration-200 shadow-lg"
        />
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