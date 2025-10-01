import { useEffect, useRef } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { createUserAccount } from "../utils";

export function useAccountCreation() {
  const { account, connected } = useWallet();
  const isProcessingRef = useRef(false);
  const processedAddressesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleAccountCreation = async () => {
      if (!connected || !account?.address || isProcessingRef.current) {
        return;
      }

      const address = account.address.toString();
      
      if (processedAddressesRef.current.has(address)) {
        return;
      }

      isProcessingRef.current = true;
      processedAddressesRef.current.add(address);

      try {
        const result = await createUserAccount(address);
        if (result.success) {
          console.log("Account created successfully:", result.data);
        } else {
          console.log("Account already exists or creation failed:", result.error);
        }
      } catch (error) {
        console.error("Failed to create account:", error);
        processedAddressesRef.current.delete(address);
      } finally {
        isProcessingRef.current = false;
      }
    };

    handleAccountCreation();
  }, [connected, account?.address]);

  useEffect(() => {
    if (!connected) {
      processedAddressesRef.current.clear();
    }
  }, [connected]);
}