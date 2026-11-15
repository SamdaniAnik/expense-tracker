/** Map display account name → sheet/import key. */
export function accountKeyFromName(name: string): string {
  if (/standard|scb/i.test(name)) return "SCB";
  if (/bkash/i.test(name)) return "BKASH";
  if (/nagad/i.test(name)) return "NAGAD";
  if (/cash/i.test(name)) return "CASH";
  return "";
}
