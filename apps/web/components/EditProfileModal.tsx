"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { addressToColor } from "@/lib/protocolLogos";
import { uploadToCloudinary } from "@/lib/protocolLogos";

export interface UserProfileData {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  twitterHandle?: string;
  websiteUrl?: string;
}

interface Props {
  address: string;
  current: UserProfileData;
  onClose: () => void;
  onSaved: (profile: UserProfileData) => void;
}

export function EditProfileModal({ address, current, onClose, onSaved }: Props) {
  const [displayName, setDisplayName] = useState(current.displayName ?? "");
  const [bio, setBio] = useState(current.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(current.avatarUrl ?? "");
  const [twitterHandle, setTwitterHandle] = useState(current.twitterHandle ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(current.websiteUrl ?? "");

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = (displayName || address).slice(0, 2).toUpperCase();
  const bgColor = addressToColor(address);
  const bioLeft = 280 - bio.length;

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const url = await uploadToCloudinary(file);
      setAvatarUrl(url);
    } catch {
      setError("Image upload failed — try again");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/profile/${address}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, displayName, bio, avatarUrl, twitterHandle, websiteUrl }),
      });
      if (!res.ok) throw new Error("Save failed");
      const saved = await res.json();
      onSaved(saved);
      onClose();
    } catch {
      setError("Failed to save profile — try again");
    } finally {
      setIsSaving(false);
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
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-black text-[#1A1A1A] text-lg font-display">Edit Profile</h3>
              <p className="text-xs text-[#888888]">How others see you on TANA-TAN</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border-2 border-[#D0CFCF] flex items-center justify-center text-[#888888] hover:border-[#F06292] hover:text-[#F06292] transition-colors text-sm"
            >
              ×
            </button>
          </div>

          {/* Avatar picker */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <div className="w-20 h-20 rounded-full border-2 border-[#1A1A1A] overflow-hidden shadow-[3px_3px_0_#1A1A1A]">
                  <Image src={avatarUrl} alt="avatar" width={80} height={80} className="w-full h-full object-cover" unoptimized />
                </div>
              ) : (
                <div
                  style={{ backgroundColor: bgColor }}
                  className="w-20 h-20 rounded-full border-2 border-[#1A1A1A] flex items-center justify-center text-white font-black text-2xl shadow-[3px_3px_0_#1A1A1A]"
                >
                  {initials}
                </div>
              )}
              {/* Camera overlay */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#F5B731] border-2 border-[#1A1A1A] flex items-center justify-center shadow-[1px_1px_0_#1A1A1A] hover:bg-[#E5A720] transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                )}
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#1A1A1A] mb-1">Profile Photo</p>
              <p className="text-[11px] text-[#888888] mb-2">Click the camera icon to upload a photo</p>
              {avatarUrl && (
                <button
                  onClick={() => setAvatarUrl("")}
                  className="text-[11px] text-[#F06292] hover:underline"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />

          {/* Display name */}
          <div className="mb-3">
            <label className="block text-xs font-bold text-[#1A1A1A] mb-1">Display Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 50))}
              placeholder="Your name or alias"
              className="w-full bg-[#FAF6EE] border-2 border-[#1A1A1A] rounded-xl px-4 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#888888] focus:outline-none focus:shadow-[3px_3px_0_#F5B731] transition-shadow"
            />
          </div>

          {/* Bio */}
          <div className="mb-3 relative">
            <label className="block text-xs font-bold text-[#1A1A1A] mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 280))}
              placeholder="Tell the community who you are as a trader…"
              rows={3}
              className="w-full bg-[#FAF6EE] border-2 border-[#1A1A1A] rounded-xl px-4 py-3 text-sm text-[#1A1A1A] placeholder:text-[#888888] focus:outline-none focus:shadow-[3px_3px_0_#F5B731] resize-none transition-shadow"
            />
            <span className={`absolute bottom-3 right-3 text-[10px] ${bioLeft < 20 ? "text-[#F06292]" : "text-[#AAAAAA]"}`}>
              {bioLeft}
            </span>
          </div>

          {/* Twitter handle */}
          <div className="mb-3">
            <label className="block text-xs font-bold text-[#1A1A1A] mb-1">X / Twitter</label>
            <div className="flex items-center gap-0">
              <span className="px-3 py-2.5 bg-[#F5F5F5] border-2 border-r-0 border-[#1A1A1A] rounded-l-xl text-sm text-[#888888]">@</span>
              <input
                value={twitterHandle}
                onChange={(e) => setTwitterHandle(e.target.value.replace(/^@/, "").slice(0, 50))}
                placeholder="username"
                className="flex-1 bg-[#FAF6EE] border-2 border-[#1A1A1A] rounded-r-xl px-4 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#888888] focus:outline-none focus:shadow-[3px_3px_0_#F5B731] transition-shadow"
              />
            </div>
          </div>

          {/* Website */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-[#1A1A1A] mb-1">Website</label>
            <input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value.slice(0, 200))}
              placeholder="https://yoursite.com"
              type="url"
              className="w-full bg-[#FAF6EE] border-2 border-[#1A1A1A] rounded-xl px-4 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#888888] focus:outline-none focus:shadow-[3px_3px_0_#F5B731] transition-shadow"
            />
          </div>

          {error && <p className="text-xs text-[#F06292] mb-3">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border-2 border-[#1A1A1A] text-sm text-[#888888] hover:text-[#1A1A1A] hover:border-[#F5B731] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isUploading}
              className="flex-1 py-2.5 rounded-xl bg-[#F5B731] hover:bg-[#E5A720] disabled:opacity-40 text-[#1A1A1A] text-sm font-black border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] hover:shadow-[4px_4px_0_#1A1A1A] transition-shadow"
            >
              {isSaving ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
