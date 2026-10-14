import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { AppProviders } from "@/lib/providers";
import { store } from "@/lib/store";
import { AUTH_TOKEN_STORAGE_KEY, logout, setCredentials } from "../authSlice";
import type { AuthUser } from "../types";

vi.mock("@/features/whitelabel/components/BrandingProvider", () => ({
  BrandingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
const user: AuthUser = {
  id: "a", name: "A", email: "a@example.test", role: "OWNER", status: "ACTIVE",
  organizationId: "factory-a", organizationStatus: "ACTIVE",
};
function Draft() {
  const [draft, setDraft] = useState("");
  return <label>Tenant draft<input value={draft} onChange={(event) => setDraft(event.target.value)} /></label>;
}
beforeEach(() => { localStorage.clear(); store.dispatch(setCredentials({ token: "session-a", user })); });
afterEach(() => store.dispatch(logout()));

describe("session-owned component state", () => {
  it("remounts tenant drafts on context/credential replacement and logout", () => {
    render(<AppProviders><Draft /></AppProviders>);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "private draft a" } });
    act(() => { store.dispatch(setCredentials({ token: "session-b", user: { ...user, organizationId: "factory-b" } })); });
    expect(screen.getByRole("textbox")).toHaveValue("");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "private draft b" } });
    act(() => { store.dispatch(logout()); });
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("invalidates caches and identity when another tab replaces the token", () => {
    render(<AppProviders><Draft /></AppProviders>);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "private draft a" } });
    act(() => { window.dispatchEvent(new StorageEvent("storage", {
      key: AUTH_TOKEN_STORAGE_KEY, oldValue: "session-a", newValue: "another-identity",
    })); });
    expect(store.getState().auth.token).toBeNull();
    expect(store.getState().auth.user).toBeNull();
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
});
