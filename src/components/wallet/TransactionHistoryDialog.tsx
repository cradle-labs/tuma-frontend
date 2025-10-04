"use client";

import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useAllTransactionHistory, TransactionData, TransactionType, PaymentTransactionData, OnrampTransactionData } from "../../hooks/useTransactionHistory";
import { useSupportedCurrencies } from "../../hooks/useSupportedCurrencies";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Loader2, RefreshCw, ExternalLink, CheckCircle, XCircle, Clock } from "lucide-react";

interface TransactionHistoryDialogProps {
  children: React.ReactNode;
}

function getStatusIcon(status: string) {
  switch (status) {
    case "Completed":
      return <CheckCircle className="h-8 w-8 text-green-500 bg-green-500/20 rounded-full p-2" />;
    case "Failed":
      return <XCircle className="h-8 w-8 text-red-500 bg-red-500/20 rounded-full p-2" />;
    case "Pending":
      return <Clock className="h-8 w-8 text-yellow-500 bg-yellow-500/20 rounded-full p-2" />;
    default:
      return <Clock className="h-8 w-8 text-gray-500 bg-gray-500/20 rounded-full p-2" />;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "Completed":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "Failed":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    case "Pending":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    default:
      return "bg-gray-500/10 text-gray-500 border-gray-500/20";
  }
}

// Type guard to check if transaction is a payment transaction
function isPaymentTransaction(transaction: TransactionData): transaction is PaymentTransactionData {
  return 'final_fiat_value' in transaction;
}

// Type guard to check if transaction is an onramp transaction
function isOnrampTransaction(transaction: TransactionData): transaction is OnrampTransactionData {
  return 'amount' in transaction;
}

function TransactionCard({ transaction }: { transaction: TransactionData }) {
  // Get supported currencies to map token addresses to symbols
  const { supportedTokensMap } = useSupportedCurrencies();
  
  // Determine if this is a payment/offramp transaction or onramp transaction
  const isPayment = isPaymentTransaction(transaction);

  console.log('transaction', transaction);
  
  // Get the appropriate amount to display
  const displayAmount = isPayment 
    ? transaction.final_fiat_value 
    : transaction.amount;
  
  // Get the appropriate token amount
  const tokenAmount = isPayment 
    ? transaction.transferred_amount 
    : transaction.final_token_quote;
  
  // Get the appropriate transaction hash
  const transactionHash = isPayment 
    ? transaction.transaction_hash 
    : transaction.on_chain_transaction_hash;
  
  // Get the token address from the transaction
  const tokenAddress = isPayment 
    ? transaction.transferred_token 
    : transaction.target_token;
  
  // Get token symbol from the address
  const getTokenSymbol = (address: string): string => {
    if (!address) return "APT"; // Default fallback
    
    // Check if the address matches any supported token
    const supportedToken = supportedTokensMap.get(address.toLowerCase());
    if (supportedToken) {
      return supportedToken.symbol;
    }
    
    // Special case for Gui Inu
    if (address === "0xe4ccb6d39136469f376242c31b34d10515c8eaaa38092f804db8e08a8f53c5b2::assets_v1::EchoCoin002") {
      return "GUI";
    }
    
    // Default fallback
    return "APT";
  };
  
  const tokenSymbol = getTokenSymbol(tokenAddress);

  return (
    <Card className="bg-white/5 backdrop-blur-md border-none rounded-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(transaction.status)}
            <div>
              <CardTitle className="text-lg font-bold text-white">
                Ksh {parseFloat(displayAmount || "0").toFixed(2)} 
              </CardTitle>
              <p className="text-xs text-gray-400">
                {new Date(transaction.requested_at).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
            </div>
          </div>
          <Badge className={`text-xs font-medium px-3 py-1 rounded-full ${getStatusColor(transaction.status)}`}>
            {transaction.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Separator line */}
          <div className="border-t border-gray-600"></div>
          
          {/* Payment-specific fields */}
          {isPayment && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              {transaction.payment_identity && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Phone Number</p>
                  <p className="text-xs font-bold text-white">
                    {transaction.payment_identity}
                  </p>
                </div>
              )}
              {transaction.payment_provider_id && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Provider</p>
                  <p className="text-xs font-bold text-white capitalize">
                    {transaction.payment_provider_id}
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Token amount and transaction details */}
          <div className="grid grid-cols-3 items-center gap-4">
            {tokenAmount && tokenAmount !== "0" && (
              <div>
                <p className="text-xs text-gray-400 mb-1">
                  {isPayment ? "Transferred" : "Final Quote"}
                </p>
                <p className="text-xs font-bold text-white">
                  {parseFloat(tokenAmount).toFixed(2)} {tokenSymbol}
                </p>
              </div>
            )}
            {transaction.data?.receipt && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Receipt</p>
                <p className="text-xs font-bold text-white font-mono">
                  {transaction.data.receipt}
                </p>
              </div>
            )}
            {transactionHash && (
            <div>
              <p className="text-xs text-gray-400">Transaction</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-white hover:text-gray-300"
                onClick={() => {
                  window.open(
                    `https://explorer.aptoslabs.com/txn/${transactionHash}`,
                    "_blank"
                  );
                }}
              >
                <span className="text-sm">View</span>
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          )}
          </div>         
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionList({ 
  transactions, 
  isLoading, 
  error, 
  onRefresh 
}: { 
  transactions: TransactionData[]; 
  isLoading: boolean; 
  error: any;
  onRefresh: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-400">Loading transactions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-4">Failed to load transactions</p>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <TransactionCard key={transaction.id} transaction={transaction} />
      ))}
    </div>
  );
}

export function TransactionHistoryDialog({ children }: TransactionHistoryDialogProps) {
  const { account } = useWallet();
  const [activeTab, setActiveTab] = useState<TransactionType>("onramp");
  const [statusFilter, setStatusFilter] = useState<"all" | "Completed" | "Pending" | "Failed">("all");
  
  const {
    onramp,
    offramp,
    payment,
    isLoading,
    isError,
    refetch
  } = useAllTransactionHistory(account?.address?.toString() || "", !!account);

  const getCurrentTransactions = () => {
    let transactions: TransactionData[] = [];
    switch (activeTab) {
      case "onramp":
        transactions = onramp.data || [];
        break;
      case "offramp":
        transactions = offramp.data || [];
        break;
      case "payment":
        transactions = payment.data || [];
        break;
      default:
        transactions = [];
    }
    
    // Apply status filter if not "all"
    if (statusFilter !== "all") {
      transactions = transactions.filter(transaction => transaction.status === statusFilter);
    }
    
    // Sort transactions by requested_at in descending order (latest first)
    return transactions.sort((a, b) => 
      new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()
    );
  };

  const getCurrentLoading = () => {
    switch (activeTab) {
      case "onramp":
        return onramp.isLoading;
      case "offramp":
        return offramp.isLoading;
      case "payment":
        return payment.isLoading;
      default:
        return false;
    }
  };

  const getCurrentError = () => {
    switch (activeTab) {
      case "onramp":
        return onramp.error;
      case "offramp":
        return offramp.error;
      case "payment":
        return payment.error;
      default:
        return null;
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl mx-auto h-[90vh] bg-[#0A0A0A] border-gray-700 flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 p-6 pb-4">
          <DialogTitle className="flex items-center justify-between text-white">
            <span>Transaction History</span>
            <Button
              variant="ghost"
              size="sm"
              className="mr-4 flex items-center gap-2 rounded-full"
              onClick={refetch}
              disabled={isLoading}
            >
              <span className="">Refresh</span>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col min-h-0 px-6 pb-6">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TransactionType)} className="flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl bg-white/10 flex-shrink-0 mb-4">
              <TabsTrigger value="onramp" className="data-[state=active]:bg-primary data-[state=active]:text-black text-gray-400 hover:text-white rounded-xl">Wallet Deposits</TabsTrigger>
              <TabsTrigger value="payment" className="data-[state=active]:bg-primary data-[state=active]:text-black text-gray-400 hover:text-white rounded-xl">Payments</TabsTrigger>
            </TabsList>
            
            {/* Status Filter Tabs */}
            <div className="mb-4">
              <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                <TabsList className="grid w-full grid-cols-4 bg-transparent  flex-shrink-0">
                  <TabsTrigger value="all" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-bold data-[state=active]:bg-transparent text-gray-400 hover:text-white bg-transparent text-xs transition-none">All</TabsTrigger>
                  <TabsTrigger value="Completed" className="data-[state=active]:border-b-2 data-[state=active]:border-green-500 data-[state=active]:text-green-500 data-[state=active]:bg-transparent text-gray-400 hover:text-white bg-transparent text-xs transition-none">Completed</TabsTrigger>
                  <TabsTrigger value="Pending" className="data-[state=active]:border-b-2 data-[state=active]:border-yellow-500 data-[state=active]:text-yellow-500 data-[state=active]:bg-transparent text-gray-400 hover:text-white bg-transparent text-xs transition-none">Pending</TabsTrigger>
                  <TabsTrigger value="Failed" className="data-[state=active]:border-b-2 data-[state=active]:border-red-500 data-[state=active]:text-red-500 data-[state=active]:bg-transparent text-gray-400 hover:text-white bg-transparent text-xs transition-none">Failed</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <TabsContent value="onramp" className="h-full overflow-y-auto">
                <TransactionList
                  transactions={getCurrentTransactions()}
                  isLoading={getCurrentLoading()}
                  error={getCurrentError()}
                  onRefresh={refetch}
                />
              </TabsContent>
              
              {/* <TabsContent value="offramp" className="h-full overflow-y-auto">
                <TransactionList
                  transactions={getCurrentTransactions()}
                  isLoading={getCurrentLoading()}
                  error={getCurrentError()}
                  onRefresh={refetch}
                />
              </TabsContent> */}
              
              <TabsContent value="payment" className="h-full overflow-y-auto">
                <TransactionList
                  transactions={getCurrentTransactions()}
                  isLoading={getCurrentLoading()}
                  error={getCurrentError()}
                  onRefresh={refetch}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
