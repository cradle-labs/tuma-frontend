"use client";

import { useAccountCreation } from "@/hooks/useAccountCreation";

export function AccountCreationHandler() {
  useAccountCreation();
  return null;
}