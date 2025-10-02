"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle } from "lucide-react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

interface PaymentMethod {
  id: string;
  owner: string;
  payment_method_type: string;
  identity: string;
  provider_id: string;
  created_at: string;
}

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (phoneNumber: string, paymentMethodId?: string) => void;
  onCreateNew: () => void;
}

export function PaymentMethodDialog({
  open,
  onOpenChange,
  onSelect,
  onCreateNew,
}: PaymentMethodDialogProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  
  const { account } = useWallet();

  useEffect(() => {
    if (open && account?.address) {
      fetchPaymentMethods();
    }
  }, [open, account?.address]);

  const fetchPaymentMethods = async () => {
    if (!account?.address) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `https://preview-api.tooma.xyz/payment-methods/${account.address}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch payment methods");
      }
      
      const data: PaymentMethod[] = await response.json();
      
      // Get unique phone numbers only
      const uniquePaymentMethods = data.reduce((acc: PaymentMethod[], current) => {
        const existingIndex = acc.findIndex(method => method.identity === current.identity);
        if (existingIndex === -1) {
          acc.push(current);
        } else {
          // Keep the more recent one
          if (new Date(current.created_at) > new Date(acc[existingIndex].created_at)) {
            acc[existingIndex] = current;
          }
        }
        return acc;
      }, []);
      
      setPaymentMethods(uniquePaymentMethods);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethod(method.id);
    onSelect(method.identity, method.id);
    onOpenChange(false);
  };

  const handleCreateNew = () => {
    onCreateNew();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/90 border-white/20 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Select Payment Method</DialogTitle>
          <DialogDescription className="text-gray-400">
            Choose an existing M-Pesa number or add a new one
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2 text-gray-400">Loading payment methods...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400 mb-4">{error}</p>
              <Button
                onClick={fetchPaymentMethods}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Retry
              </Button>
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No payment methods found</p>
              <Button
                onClick={handleCreateNew}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                Add New Payment Method
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    onClick={() => handleSelectMethod(method)}
                    className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {method.provider_id === "mpesa" ? "M" : "S"}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{method.identity}</p>
                        <p className="text-gray-400 text-sm capitalize">
                          {method.provider_id} • {method.payment_method_type.replace("-", " ")}
                        </p>
                      </div>
                    </div>
                    {selectedMethod === method.id && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                ))}
              </div>
              
              <div className="pt-4 border-t border-white/10">
                <Button
                  onClick={handleCreateNew}
                  variant="primary"
                  className="w-full"
                >
                  Add New Payment Method
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}