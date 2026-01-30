import { signal, effect } from "seiro/client";
import type { Client } from "seiro";
import type { Commands, Queries, Events, Shipment } from "../types";
import { user } from "./auth";

type AppClient = Client<Commands, Queries, Events>;

// State
const shipments = signal(new Map<string, Shipment>());
const events = signal<string[]>([]);

let client: AppClient;

export function initShipments(c: AppClient) {
  client = c;

  // Subscribe to shipment events
  client.on("shipment_created", (s) => {
    updateShipment(s);
    log(`Created: ${s.id} ${s.origin} -> ${s.dest}`);
  });

  client.on("shipment_claimed", (s) => {
    updateShipment(s);
    log(`Claimed: ${s.id} by ${s.carrierId}`);
  });

  client.on("shipment_delivered", (s) => {
    updateShipment(s);
    log(`Delivered: ${s.id}`);
  });

  // Subscribe and load when user becomes available
  effect(() => {
    if (user.value) {
      client.subscribe();
      loadShipments();
    }
  });
}

async function loadShipments() {
  try {
    for await (const shipment of client.query("shipments.all")) {
      updateShipment(shipment);
    }
  } catch {
    // Not authenticated
  }
}

function updateShipment(shipment: Shipment) {
  const next = new Map(shipments.value);
  next.set(shipment.id, shipment);
  shipments.value = next;
}

function log(msg: string) {
  const time = new Date().toLocaleTimeString();
  events.value = [`[${time}] ${msg}`, ...events.value].slice(0, 50);
}

function logError(err: string) {
  log(`Error: ${err}`);
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-900/50 border-yellow-700",
  claimed: "bg-blue-900/50 border-blue-700",
  delivered: "bg-green-900/50 border-green-700",
};

const statusBadgeColors: Record<string, string> = {
  pending: "bg-yellow-700 text-yellow-100",
  claimed: "bg-blue-700 text-blue-100",
  delivered: "bg-green-700 text-green-100",
};

class ShipmentList extends HTMLElement {
  private loginPrompt!: HTMLElement;
  private listContainer!: HTMLElement;

  connectedCallback() {
    this.innerHTML = `
      <p class="login-prompt hidden text-zinc-500">Please login to view shipments</p>
      <div class="list-container space-y-2"></div>
    `;

    this.loginPrompt = this.querySelector(".login-prompt")!;
    this.listContainer = this.querySelector(".list-container")!;

    effect(() => {
      if (!user.value) {
        this.loginPrompt.classList.remove("hidden");
        this.listContainer.classList.add("hidden");
        return;
      }

      this.loginPrompt.classList.add("hidden");
      this.listContainer.classList.remove("hidden");

      const list = [...shipments.value.values()].sort((a, b) =>
        a.id.localeCompare(b.id),
      );

      this.listContainer.innerHTML =
        list
          .map(
            (s) => `
        <div class="p-3 rounded border ${statusColors[s.status] || "bg-zinc-800 border-zinc-700"} flex justify-between items-center">
          <div class="space-y-1">
            <div class="font-mono text-sm text-zinc-300">${s.id}</div>
            <div class="text-white">${s.origin} → ${s.dest}</div>
            ${s.carrierId ? `<div class="text-zinc-400 text-sm">Carrier: ${s.carrierId}</div>` : ""}
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded text-xs font-medium ${statusBadgeColors[s.status] || "bg-zinc-700 text-zinc-300"}">${s.status}</span>
            ${s.status === "pending" ? `<button data-claim="${s.id}" class="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm">Claim</button>` : ""}
            ${s.status === "claimed" ? `<button data-deliver="${s.id}" class="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-sm">Deliver</button>` : ""}
          </div>
        </div>
      `,
          )
          .join("") || "<p class='text-zinc-500'>No shipments yet</p>";
    });

    this.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const claimId = target.dataset.claim;
      const deliverId = target.dataset.deliver;

      if (claimId) {
        client.cmd(
          "shipment.claim",
          { id: claimId, carrierId: "CARRIER-001" },
          { onError: logError },
        );
      }
      if (deliverId) {
        client.cmd(
          "shipment.deliver",
          { id: deliverId },
          { onError: logError },
        );
      }
    });
  }
}

class CreateForm extends HTMLElement {
  private loginPrompt!: HTMLElement;
  private form!: HTMLFormElement;

  connectedCallback() {
    this.innerHTML = `
      <p class="login-prompt hidden text-zinc-500">Please login to create shipments</p>
      <form class="hidden flex-wrap items-center gap-2">
        <input name="origin" placeholder="Origin (e.g. AMS)" required
          class="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 w-32" />
        <input name="dest" placeholder="Destination (e.g. LAX)" required
          class="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 w-32" />
        <button type="submit" class="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-1.5 rounded text-sm">Create</button>
      </form>
    `;

    this.loginPrompt = this.querySelector(".login-prompt")!;
    this.form = this.querySelector("form")!;

    effect(() => {
      if (user.value) {
        this.loginPrompt.classList.add("hidden");
        this.form.classList.remove("hidden");
        this.form.classList.add("flex");
      } else {
        this.loginPrompt.classList.remove("hidden");
        this.form.classList.add("hidden");
        this.form.classList.remove("flex");
      }
    });

    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(this.form);

      client.cmd(
        "shipment.create",
        {
          origin: data.get("origin") as string,
          dest: data.get("dest") as string,
        },
        { onError: logError },
      );

      this.form.reset();
    });
  }
}

class EventLog extends HTMLElement {
  private container!: HTMLElement;

  connectedCallback() {
    this.innerHTML = `<div class="events-container space-y-1 font-mono text-sm max-h-48 overflow-y-auto"></div>`;
    this.container = this.querySelector(".events-container")!;

    effect(() => {
      this.container.innerHTML = events.value
        .map((msg) => `<div class="text-zinc-400">${msg}</div>`)
        .join("");
    });
  }
}

customElements.define("shipment-list", ShipmentList);
customElements.define("create-form", CreateForm);
customElements.define("event-log", EventLog);
