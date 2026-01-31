import { signal, effect } from "seiro/client";
import type { Client } from "seiro";
import type { Commands, Queries, Events, User } from "../types";

type AppClient = Client<Commands, Queries, Events>;

// State
export const user = signal<User | null>(null);
const authError = signal<string | null>(null);

let client: AppClient;

export function initAuth(c: AppClient, profile: User | null) {
  client = c;
  user.value = profile;
}

function handleAuthSuccess(result: { token: string; user: User }) {
  client.setToken(result.token);
  user.value = result.user;
  authError.value = null;
}

export function logout() {
  client.logout();
  user.value = null;
}

class AuthForm extends HTMLElement {
  private userView!: HTMLElement;
  private formsView!: HTMLElement;
  private emailSpan!: HTMLElement;
  private errorDiv!: HTMLElement;

  connectedCallback() {
    this.innerHTML = `
      <div class="auth-user hidden items-center gap-4">
        <span class="text-zinc-300">Logged in as <strong class="user-email text-white"></strong></span>
        <button id="logout" class="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1 rounded text-sm">Logout</button>
      </div>
      <div class="auth-forms space-y-4">
        <form id="login-form" class="flex flex-wrap items-center gap-2">
          <span class="text-zinc-400 w-20">Login</span>
          <input name="email" type="email" placeholder="Email" value="test@example.com" required
            class="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500" />
          <input name="password" type="password" placeholder="Password" value="password123" required
            class="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500" />
          <button type="submit" class="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-1.5 rounded text-sm">Login</button>
        </form>
        <form id="register-form" class="flex flex-wrap items-center gap-2">
          <span class="text-zinc-400 w-20">Register</span>
          <input name="email" type="email" placeholder="Email" value="test@example.com" required
            class="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500" />
          <input name="password" type="password" placeholder="Password" value="password123" required
            class="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500" />
          <button type="submit" class="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-1.5 rounded text-sm">Register</button>
        </form>
        <div class="auth-error hidden text-red-400 text-sm"></div>
      </div>
    `;

    this.userView = this.querySelector(".auth-user")!;
    this.formsView = this.querySelector(".auth-forms")!;
    this.emailSpan = this.querySelector(".user-email")!;
    this.errorDiv = this.querySelector(".auth-error")!;

    // Update visibility based on state
    effect(() => {
      if (user.value) {
        this.userView.classList.remove("hidden");
        this.userView.classList.add("flex");
        this.formsView.classList.add("hidden");
        this.emailSpan.textContent = user.value.email;
      } else {
        this.userView.classList.add("hidden");
        this.userView.classList.remove("flex");
        this.formsView.classList.remove("hidden");
      }
    });

    effect(() => {
      if (authError.value) {
        this.errorDiv.classList.remove("hidden");
        this.errorDiv.textContent = authError.value;
      } else {
        this.errorDiv.classList.add("hidden");
      }
    });

    this.addEventListener("submit", (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const data = new FormData(form);
      const email = data.get("email") as string;
      const password = data.get("password") as string;

      const callbacks = {
        onSuccess: handleAuthSuccess,
        onError: (err: string) => {
          authError.value = err;
        },
      };

      if (form.id === "login-form") {
        client.cmd("auth.login", { email, password }, callbacks);
      } else if (form.id === "register-form") {
        client.cmd("auth.register", { email, password }, callbacks);
      }
    });

    this.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.id === "logout") {
        logout();
      }
    });
  }
}

customElements.define("auth-form", AuthForm);
