import { useState, useEffect } from "react";

export interface ProfileSummary {
  address: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  twitterHandle?: string;
}

// Simple module-level cache so we don't re-fetch the same address in the same session
const cache = new Map<string, ProfileSummary>();

export function useUserProfile(address: string | undefined) {
  const [profile, setProfile] = useState<ProfileSummary | null>(
    address ? (cache.get(address.toLowerCase()) ?? null) : null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    const key = address.toLowerCase();
    if (cache.has(key)) {
      setProfile(cache.get(key)!);
      return;
    }
    setLoading(true);
    fetch(`/api/profile/${key}`)
      .then((r) => r.json())
      .then((data) => {
        const p: ProfileSummary = {
          address: key,
          ...(data.profile ?? {}),
        };
        cache.set(key, p);
        setProfile(p);
      })
      .catch(() => {
        const fallback: ProfileSummary = { address: key };
        cache.set(key, fallback);
        setProfile(fallback);
      })
      .finally(() => setLoading(false));
  }, [address]);

  return { profile, loading };
}
