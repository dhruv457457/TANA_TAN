"use client";
import { motion, AnimatePresence } from "framer-motion";
import type { Alert } from "@/types";

interface Props {
  alerts: Alert[];
  onDismiss?: (index: number) => void;
}

export function AlertBanner({ alerts, onDismiss }: Props) {
  return (
    <AnimatePresence>
      {alerts.map((alert, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-start gap-3 p-4 rounded-xl border border-amber-400/20 bg-amber-400/10"
        >
          <span className="text-amber-400 mt-0.5 shrink-0">
            {alert.type === "drop" ? "⚠️" : "🚀"}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-200">{alert.message}</p>
            {alert.newVault && (
              <p className="text-xs text-amber-300/60 mt-1">
                Better option: {alert.newVault.name} at{" "}
                {((alert.newApy ?? alert.newVault.apy.total) * 100).toFixed(2)}% APY
              </p>
            )}
          </div>
          {onDismiss && (
            <button
              onClick={() => onDismiss(i)}
              className="text-amber-400/50 hover:text-amber-400 text-xs shrink-0 mt-0.5"
            >
              ✕
            </button>
          )}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
