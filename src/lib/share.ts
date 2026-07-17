import { FORTUNES } from "@/src/lib/fortunes";

export function getSharedFortuneId(search: string) {
  const value = new URLSearchParams(search).get("fortune");
  if (value === null || value.trim() === "") return null;
  const id = Number(value);
  return Number.isInteger(id) && FORTUNES.some((fortune) => fortune.id === id) ? id : null;
}

export function buildFortuneShareUrl(origin: string, fortuneId: number) {
  const url = new URL("/result", origin);
  url.searchParams.set("fortune", String(fortuneId));
  return url.toString();
}
