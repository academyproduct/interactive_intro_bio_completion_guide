import { LRS } from "./lrsConfig";

// Simple UUID helper
function uuidv4(): string {
  // crypto.randomUUID exists in modern browsers
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function sendXapiStatement(statement: unknown): Promise<void> {
  const statementId = uuidv4();
  
  const url = `${LRS.endpoint}?statementId=${encodeURIComponent(statementId)}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Experience-API-Version": LRS.version,
    },
    body: JSON.stringify(statement),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LRS error ${res.status}: ${text || res.statusText}`);
  }
}
