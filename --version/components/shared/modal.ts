// Modal utilities - styled overlays, no browser dialogs

export function showToast(message: string, duration = 3000): void {
  const toast = document.createElement("div");
  toast.style.cssText =
    "position:fixed;bottom:1rem;left:50%;transform:translateX(-50%);background:#27272a;border:1px solid #3f3f46;padding:0.5rem 1rem;border-radius:0.5rem;color:#f4f4f5;z-index:9999";
  toast.textContent = message;

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// Simple modal for text input - replaces window.prompt()

export function showInputModal(
  title: string,
  initialValue = "",
): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:9999;background:rgba(0,0,0,0.5)";
    overlay.innerHTML = `
      <div style="background:#27272a;color:#f4f4f5;padding:1.5rem;border-radius:0.5rem;min-width:18rem">
        <h2 style="font-size:1.125rem;font-weight:bold;margin-bottom:1rem">${title}</h2>
        <input data-input style="width:100%;background:#3f3f46;border:1px solid #52525b;border-radius:0.375rem;padding:0.5rem 0.75rem;color:#f4f4f5;outline:none;margin-bottom:1rem" />
        <div style="display:flex;gap:0.5rem">
          <button data-cancel style="flex:1;background:#3f3f46;padding:0.5rem 1rem;border-radius:0.375rem;cursor:pointer;border:none;color:#f4f4f5">Cancel</button>
          <button data-ok style="flex:1;background:#52525b;padding:0.5rem 1rem;border-radius:0.375rem;cursor:pointer;border:none;color:#f4f4f5">OK</button>
        </div>
      </div>
    `;

    const input = overlay.querySelector<HTMLInputElement>("[data-input]")!;
    input.value = initialValue;

    const cancelBtn =
      overlay.querySelector<HTMLButtonElement>("[data-cancel]")!;
    const okBtn = overlay.querySelector<HTMLButtonElement>("[data-ok]")!;

    const close = (value: string | null) => {
      overlay.remove();
      resolve(value);
    };

    const submit = () => {
      const value = input.value.trim();
      close(value || null);
    };

    okBtn.onclick = submit;
    cancelBtn.onclick = () => close(null);
    input.onkeydown = (e) => {
      if (e.key === "Enter") submit();
      if (e.key === "Escape") close(null);
    };

    // Close on backdrop click
    overlay.onclick = (e) => {
      if (e.target === overlay) close(null);
    };

    document.body.appendChild(overlay);
    queueMicrotask(() => {
      input.focus();
      input.select();
    });
  });
}

// Form modal with multiple fields

export type FormField = {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
};

export function showFormModal(
  title: string,
  fields: FormField[],
): Promise<Record<string, string> | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:9999;background:rgba(0,0,0,0.5)";

    const fieldsHtml = fields
      .map(
        (f) => `
      <div style="display:flex;flex-direction:column;gap:0.25rem">
        <label style="font-size:0.875rem;color:#a1a1aa">${f.label}${f.required ? " *" : ""}</label>
        <input name="${f.name}" placeholder="${f.placeholder || ""}" ${f.required ? "required" : ""}
          style="width:100%;background:#3f3f46;border:1px solid #52525b;border-radius:0.375rem;padding:0.5rem 0.75rem;color:#f4f4f5;outline:none" />
      </div>
    `,
      )
      .join("");

    overlay.innerHTML = `
      <form style="background:#27272a;color:#f4f4f5;padding:1.5rem;border-radius:0.5rem;min-width:20rem">
        <h2 style="font-size:1.125rem;font-weight:bold;margin-bottom:1rem">${title}</h2>
        <div style="display:flex;flex-direction:column;gap:0.75rem;margin-bottom:1rem">
          ${fieldsHtml}
        </div>
        <div style="display:flex;gap:0.5rem">
          <button type="button" data-cancel style="flex:1;background:#3f3f46;padding:0.5rem 1rem;border-radius:0.375rem;cursor:pointer;border:none;color:#f4f4f5">Cancel</button>
          <button type="submit" style="flex:1;background:#52525b;padding:0.5rem 1rem;border-radius:0.375rem;cursor:pointer;border:none;color:#f4f4f5">OK</button>
        </div>
      </form>
    `;

    const form = overlay.querySelector<HTMLFormElement>("form")!;
    const cancelBtn =
      overlay.querySelector<HTMLButtonElement>("[data-cancel]")!;
    const firstInput = form.querySelector<HTMLInputElement>("input")!;

    const close = (value: Record<string, string> | null) => {
      overlay.remove();
      resolve(value);
    };

    form.onsubmit = (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const result: Record<string, string> = {};
      for (const field of fields) {
        result[field.name] = (data.get(field.name) as string)?.trim() || "";
      }
      // Check required fields
      for (const field of fields) {
        if (field.required && !result[field.name]) return;
      }
      close(result);
    };

    cancelBtn.onclick = () => close(null);

    overlay.onclick = (e) => {
      if (e.target === overlay) close(null);
    };

    overlay.onkeydown = (e) => {
      if (e.key === "Escape") close(null);
    };

    document.body.appendChild(overlay);
    queueMicrotask(() => firstInput?.focus());
  });
}

// Simple confirmation modal - replaces window.confirm()

export function showConfirmModal(
  title: string,
  message: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:9999;background:rgba(0,0,0,0.5)";
    overlay.innerHTML = `
      <div style="background:#27272a;color:#f4f4f5;padding:1.5rem;border-radius:0.5rem;min-width:18rem">
        <h2 style="font-size:1.125rem;font-weight:bold;margin-bottom:0.75rem">${title}</h2>
        <p style="color:#a1a1aa;margin-bottom:1rem">${message}</p>
        <div style="display:flex;gap:0.5rem">
          <button data-cancel style="flex:1;background:#3f3f46;padding:0.5rem 1rem;border-radius:0.375rem;cursor:pointer;border:none;color:#f4f4f5">Cancel</button>
          <button data-ok style="flex:1;background:#b91c1c;padding:0.5rem 1rem;border-radius:0.375rem;cursor:pointer;border:none;color:#f4f4f5">Confirm</button>
        </div>
      </div>
    `;

    const cancelBtn =
      overlay.querySelector<HTMLButtonElement>("[data-cancel]")!;
    const okBtn = overlay.querySelector<HTMLButtonElement>("[data-ok]")!;

    let closed = false;
    const close = (value: boolean) => {
      if (closed) return;
      closed = true;
      document.removeEventListener("keydown", handleKey);
      overlay.remove();
      resolve(value);
    };

    okBtn.onclick = () => close(true);
    cancelBtn.onclick = () => close(false);

    // Close on backdrop click
    overlay.onclick = (e) => {
      if (e.target === overlay) close(false);
    };

    // Handle keyboard
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };
    document.addEventListener("keydown", handleKey);

    document.body.appendChild(overlay);
    queueMicrotask(() => okBtn.focus());
  });
}
