// localStorage wrapper. Every access guarded: private mode or quota errors must never break the UI.
export function readCache<T>(key: string): T | null {
  try {
    const s = localStorage.getItem("dh:" + key);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}

export function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem("dh:" + key, JSON.stringify(value));
  } catch {}
}

export function clearCache() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith("dh:")).forEach((k) => localStorage.removeItem(k));
  } catch {}
}
