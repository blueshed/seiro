import { signal } from "seiro/client";

export const route = signal(window.location.hash || "#/");

window.addEventListener("hashchange", () => {
  route.value = window.location.hash || "#/";
});

export function navigate(hash: string) {
  window.location.hash = hash;
}
