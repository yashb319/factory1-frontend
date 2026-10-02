import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { HealthCheckWelcome } from "../components/HealthCheckWelcome";
import { HEALTH_CHECK_WELCOME_KEY, completeWelcome } from "../storage";

describe("HealthCheckWelcome", () => {
  it("opens for a first visit, traps focus, and dismisses with Escape", async () => {
    const user = userEvent.setup();
    render(<HealthCheckWelcome />);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Welcome to Factory1");
    expect(screen.getByRole("link", { name: /start health check/i })).toHaveAttribute("href", "/health-check");
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(JSON.parse(localStorage.getItem(HEALTH_CHECK_WELCOME_KEY) ?? "{}").status).toBe("dismissed");
  });

  it("does not open after completion", async () => {
    completeWelcome();
    render(<HealthCheckWelcome />);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
