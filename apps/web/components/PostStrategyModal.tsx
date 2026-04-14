"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import Image from "next/image";
import type { AllocationPlan } from "@/types";
import { uploadToCloudinary } from "@/lib/protocolLogos";

interface Props {
  plan?: AllocationPlan;
  onClose: () => void;
  onPosted: () => void;
}

export function PostStrategyModal({ plan, onClose, onPosted }: Props) {
  const { address } = useAccount();
  const [pitch, setPitch] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const vault = plan?.vault;
  const charLeft = 280 - pitch.length;

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setImageUrl(url);
    } catch {
      setError("Image upload failed — try again");
    } finally {
      setIsUploading(false);
    }
  }

  async function handlePost() {
    if (!address || !vault) return;
    setIsPosting(true);
    setError(null);
    try {
      const res = await fetch("/api/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: address,
          vaultAddress: vault.address,
          chainId: vault.chainId,
          protocol: vault.protocol,
          protocolLogoUri: vault.protocolLogoUri ?? "",
          chainName: vault.chainName,
          vaultName: vault.name,
          asset: vault.asset,
          apy: vault.apy.total,
          tvlUsd: vault.tvl.usd,
          riskLabel: vault.riskLabel ?? "Balanced",
          pitch,
          imageUrl,
        }),
      });
      if (!res.ok) throw new Error("Failed to post");
      onPosted();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error posting strategy");
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md rounded-xl border-2 border-[#1A1A1A] bg-white p-5 shadow-[6px_6px_0_#1A1A1A]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-black text-[#1A1A1A] text-lg font-display">Post to Feed</h3>
              <p className="text-xs text-[#888888]">Share your yield strategy with the community</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full border-2 border-[#D0CFCF] flex items-center justify-center text-[#888888] hover:border-[#F06292] hover:text-[#F06292] transition-colors text-sm">
              ×
            </button>
          </div>

          {/* Vault preview */}
          {vault && (
            <div className="rounded-xl border-2 border-[#1A1A1A] bg-[#FAF6EE] p-3 mb-4 flex items-center gap-3 shadow-[2px_2px_0_#1A1A1A]">
              <div className="w-10 h-10 rounded-lg bg-[#F5B731] border-2 border-[#1A1A1A] flex items-center justify-center text-[#1A1A1A] font-black text-xs shrink-0">
                {vault.protocol.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#1A1A1A] truncate font-display">{vault.name}</p>
                <p className="text-xs text-[#888888]">{vault.chainName} · {vault.protocol}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-base font-black text-[#4CAF82] font-display">{(vault.apy.total * 100).toFixed(2)}%</p>
                <p className="text-[10px] text-[#888888]">APY</p>
              </div>
            </div>
          )}

          {/* Pitch — tweet-style with char count */}
          <div className="relative mb-3">
            <textarea
              value={pitch}
              onChange={(e) => setPitch(e.target.value.slice(0, 280))}
              placeholder="What's your thesis? Why follow this strategy? (optional)"
              rows={3}
              className="w-full bg-[#FAF6EE] border-2 border-[#1A1A1A] rounded-xl px-4 py-3 text-sm text-[#1A1A1A] placeholder:text-[#888888] focus:outline-none focus:shadow-[3px_3px_0_#F5B731] resize-none transition-shadow"
            />
            <span className={`absolute bottom-3 right-3 text-[10px] ${charLeft < 20 ? "text-[#F06292]" : "text-[#AAAAAA]"}`}>
              {charLeft}
            </span>
          </div>

          {/* Image upload (Cloudinary) */}
          <div className="mb-4">
            {imageUrl ? (
              <div className="relative rounded-xl overflow-hidden border-2 border-[#1A1A1A]">
                <Image src={imageUrl} alt="preview" width={400} height={200} className="w-full object-cover max-h-40" unoptimized />
                <button
                  onClick={() => setImageUrl("")}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center text-sm hover:bg-[#F06292] transition-colors"
                >×</button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={isUploading}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#D0CFCF] hover:border-[#F5B731] text-xs text-[#888888] hover:text-[#1A1A1A] flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Uploading to Cloudinary…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M7 1v8M4 4l3-3 3 3" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M1 10v2a1 1 0 001 1h10a1 1 0 001-1v-2" strokeLinecap="round"/>
                    </svg>
                    Add image (optional)
                  </>
                )}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
          </div>

          {error && <p className="text-xs text-[#F06292] mb-3">{error}</p>}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border-2 border-[#1A1A1A] text-sm text-[#888888] hover:text-[#1A1A1A] hover:border-[#F5B731] transition-colors">
              Cancel
            </button>
            <button
              onClick={handlePost}
              disabled={isPosting || isUploading || !address || !vault}
              className="flex-1 py-2.5 rounded-xl bg-[#F5B731] hover:bg-[#E5A720] disabled:opacity-40 text-[#1A1A1A] text-sm font-black border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] hover:shadow-[4px_4px_0_#1A1A1A] transition-shadow"
            >
              {isUploading ? "Uploading image…" : isPosting ? "Posting…" : "Post to Feed"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
