/** Phones / tablets — force the mobile app chrome even if the browser asks for “Desktop site”. */
export function isMobileUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|CriOS|FxiOS/i.test(
    ua,
  );
}
