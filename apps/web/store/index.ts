import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatMessage, AllocationPlan, ParsedIntent, Alert } from "@/types";

interface TanaStore {
  // Chat
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;

  // Intent
  currentIntent: ParsedIntent | null;
  setIntent: (intent: ParsedIntent | null) => void;

  // Allocations
  allocations: AllocationPlan[];
  setAllocations: (allocs: AllocationPlan[]) => void;

  // Wallet
  walletAddress: string | null;
  setWalletAddress: (addr: string | null) => void;

  // Alerts
  alerts: Alert[];
  setAlerts: (alerts: Alert[]) => void;

  // UI state
  isExecuting: boolean;
  setExecuting: (v: boolean) => void;
  showRouteMap: boolean;
  setShowRouteMap: (v: boolean) => void;
}

export const useTanaStore = create<TanaStore>()(
  persist(
    (set) => ({
      messages: [],
      addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
      clearMessages: () => set({ messages: [] }),

      currentIntent: null,
      setIntent: (intent) => set({ currentIntent: intent }),

      allocations: [],
      setAllocations: (allocations) => set({ allocations }),

      walletAddress: null,
      setWalletAddress: (walletAddress) => set({ walletAddress }),

      alerts: [],
      setAlerts: (alerts) => set({ alerts }),

      isExecuting: false,
      setExecuting: (isExecuting) => set({ isExecuting }),

      showRouteMap: false,
      setShowRouteMap: (showRouteMap) => set({ showRouteMap }),
    }),
    {
      name: "tana-chat-storage",
      partialize: (state) => ({ messages: state.messages }),
    }
  )
);
