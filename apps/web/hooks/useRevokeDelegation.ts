"use client";
import { useState } from "react";
import { useAccount } from "wagmi";

export type RevokeStatus = "idle" | "revoking" | "done" | "error";

export function useRevokeDelegation() {
  const { address } = useAccount();
  const [status, setStatus] = useState<RevokeStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function revoke(delegationId: string) {
    if (!address) {
      setError("Connect wallet first");
      setStatus("error");
      return;
    }

    setStatus("revoking");
    setError(null);

    try {
      const res = await fetch(`/api/delegations/${delegationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", followerAddress: address }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Revoke failed");
      }

      setStatus("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setStatus("error");
    }
  }

  function reset() {
    setStatus("idle");
    setError(null);
  }

  return { revoke, status, error, reset };
}
