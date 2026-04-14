/**
 * Derives a protocol favicon URL from the protocol's own website URL
 * (sourced from LiFi Earn API's protocol.url field).
 * e.g. "https://app.morpho.org/base/vault/0x..." → "https://app.morpho.org/favicon.ico"
 */
export function getProtocolLogoFromUrl(protocolUrl: string | undefined): string | null {
  if (!protocolUrl) return null;
  try {
    const u = new URL(protocolUrl);
    return `${u.protocol}//${u.hostname}/favicon.ico`;
  } catch {
    return null;
  }
}

/** Upload a file to Cloudinary via our API route and return the secure_url */
export async function uploadToCloudinary(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.url as string;
}

/** Deterministic color from any string (address or protocol name) for avatar fallback */
export function addressToColor(input: string): string {
  const colors = [
    "#F5B731", "#4CAF82", "#2F7EE5", "#F06292",
    "#9C6ADE", "#FF7043", "#26A69A", "#EC407A",
  ];
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
