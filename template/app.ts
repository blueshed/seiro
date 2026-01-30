import { createClient, effect } from "seiro/client";
import type { Commands, Queries, Events, User } from "./types";
import { initAuth, user } from "./components/auth";
import "./components/auth";

// Create client
const wsUrl = `ws://${window.location.host}/ws`;
const client = createClient<Commands, Queries, Events>(wsUrl);

// Connect and initialize
async function main() {
  const profile = await client.connect<User>();
  initAuth(client, profile);
  client.subscribe();

  // Show/hide content based on auth state
  effect(() => {
    const main = document.querySelector("main");
    if (main) {
      if (user.value) {
        main.innerHTML = `
          <div class="text-center py-12">
            <h2 class="text-2xl font-bold text-white mb-4">Welcome!</h2>
            <p class="text-zinc-400">You are logged in as ${user.value.email}</p>
            <p class="text-zinc-500 mt-8">Start building your app by adding entities.</p>
          </div>
        `;
      } else {
        main.innerHTML = `
          <div class="text-center py-12">
            <h2 class="text-2xl font-bold text-white mb-4">Welcome to Seiro</h2>
            <p class="text-zinc-400">Please login or register to continue.</p>
          </div>
        `;
      }
    }
  });
}

main().catch(console.error);
