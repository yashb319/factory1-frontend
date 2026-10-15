import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductActivation } from "../onboarding/ProductActivation";
import { runtimeBootstrap, factoryId } from "./runtimeFixtures";

afterEach(() => { vi.unstubAllGlobals(); window.history.replaceState(null, "", "/"); });
const envelope = (data: unknown) => new Response(JSON.stringify({ success: true, message: "OK", data }));
describe("branded explicit factory invitation entry", () => {
  it("removes invitation credentials from the URL, validates password and never stores tokens", async () => {
    window.history.replaceState(null, "", `/activate?token=${"t".repeat(43)}`);
    const network = vi.fn().mockImplementation(async (path: string) => path === "/auth/invitation" && network.mock.calls.length === 1
      ? envelope({ csrfToken: "C".repeat(43) })
      : envelope({ accepted: true, organizationId: factoryId, subscriptionStatus: "PENDING" }));
    vi.stubGlobal("fetch", network);
    render(<ProductActivation />);
    expect(window.location.search).not.toContain("token");
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "weak" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "weak" } });
    fireEvent.submit(screen.getByRole("form", { name: "Accept factory owner invitation" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Passwords must match");
    expect(network).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "Test-Only-Password1!" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "Test-Only-Password1!" } });
    fireEvent.submit(screen.getByRole("form", { name: "Accept factory owner invitation" }));
    expect(await screen.findByRole("heading", { name: "Invitation accepted" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("PENDING");
    expect(network.mock.calls[1][1]).toMatchObject({
      method: "POST", credentials: "same-origin", cache: "no-store",
      headers: expect.objectContaining({ "X-CSRF-Token": "C".repeat(43) }),
    });
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it("requires current authenticated session before explicit existing-account acceptance", async () => {
    window.history.replaceState(null, "", `/activate?token=${"t".repeat(43)}`);
    const network = vi.fn().mockResolvedValue(new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", network);
    render(<ProductActivation />);
    fireEvent.change(screen.getByLabelText("Account type"), { target: { value: "existing" } });
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in in a separate tab" })).toHaveAttribute("rel", "noopener noreferrer");
    fireEvent.submit(screen.getByRole("form", { name: "Accept factory owner invitation" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("explicitly invited account"));
    expect(network).toHaveBeenCalledTimes(1);
    expect(network).toHaveBeenCalledWith("/auth/session", expect.anything());
    network.mockImplementation(async (path: string) => path === "/auth/session"
      ? envelope(runtimeBootstrap()) : envelope({ accepted: true, organizationId: factoryId, subscriptionStatus: "PENDING" }));
    fireEvent.submit(screen.getByRole("form", { name: "Accept factory owner invitation" }));
    expect(await screen.findByRole("heading", { name: "Invitation accepted" })).toBeInTheDocument();
    expect(network.mock.calls.at(-1)?.[0]).toBe("/auth/invitation/accept");
    expect(JSON.parse(String(network.mock.calls.at(-1)?.[1].body))).toEqual({ token: "t".repeat(43) });
  });
});
