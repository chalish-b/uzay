export type ItemId = string;

// Generates a UUID v4 string for item IDs.
//
// crypto.randomUUID() is only defined in secure contexts (HTTPS or localhost),
// so it's missing when a page is served over plain HTTP from a LAN IP. We fall
// back to crypto.getRandomValues(), which works in insecure contexts too, and
// finally to Math.random() if no Web Crypto is present at all.
export function generateId(): ItemId {
  if (typeof crypto !== "undefined") {
    if (typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    if (typeof crypto.getRandomValues === "function") {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
      const hex: string[] = [];
      for (const byte of bytes) {
        hex.push(byte.toString(16).padStart(2, "0"));
      }
      return (
        hex.slice(0, 4).join("") +
        "-" +
        hex.slice(4, 6).join("") +
        "-" +
        hex.slice(6, 8).join("") +
        "-" +
        hex.slice(8, 10).join("") +
        "-" +
        hex.slice(10, 16).join("")
      );
    }
  }

  let uuid = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += "-";
    } else if (i === 14) {
      uuid += "4";
    } else {
      const rand = Math.floor(Math.random() * 16);
      uuid += (i === 19 ? (rand & 0x3) | 0x8 : rand).toString(16);
    }
  }
  return uuid;
}
