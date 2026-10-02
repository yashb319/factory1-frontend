import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HEALTH_CHECK_STEPS } from "../config";
import { HealthCheckPage } from "../components/HealthCheckPage";
import { createHealthCheckDraft, saveHealthCheckDraft } from "../storage";
import { HEALTH_CHECK_DRAFT_KEY, HEALTH_CHECK_WELCOME_KEY } from "../storage";

const push = vi.fn();
const submit = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("../api/healthCheckApi", () => ({
  useSubmitHealthCheckMutation: () => [submit, { isLoading: false }],
}));

function reviewDraft() {
  const draft = createHealthCheckDraft();
  draft.step = HEALTH_CHECK_STEPS.length;
  draft.answers = Object.fromEntries(
    HEALTH_CHECK_STEPS.flatMap((step) =>
      step.questions.map((question) => [question.id, question.type === "checkbox" ? [question.options[0].value] : question.options[0].value])
    )
  );
  draft.contact = { name: "Asha Rao", email: "asha@example.com", phone: "9876543210", companyName: "Asha Works", city: "Pune" };
  return draft;
}

describe("HealthCheckPage", () => {
  beforeEach(() => {
    push.mockReset();
    submit.mockReset();
  });

  it("blocks step transitions until every required answer is selected", async () => {
    const user = userEvent.setup();
    render(<HealthCheckPage />);
    expect(await screen.findByRole("heading", { name: "Your factory" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getAllByRole("alert")).toHaveLength(3);

    await user.click(screen.getByLabelText("1-20"));
    await user.click(screen.getByLabelText("Made to order"));
    await user.click(screen.getByLabelText("One"));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByRole("heading", { name: "People operations" })).toBeInTheDocument();
  });

  it("prevents duplicate submission and preserves state with an inline backend error", async () => {
    saveHealthCheckDraft(reviewDraft());
    let rejectRequest: (reason?: unknown) => void = () => {};
    const request = new Promise((_resolve, reject) => { rejectRequest = reject; });
    submit.mockReturnValue({ unwrap: () => request });
    render(<HealthCheckPage />);

    expect(await screen.findByRole("heading", { name: /contact, consent, and review/i })).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /submit health check/i });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(submit).toHaveBeenCalledTimes(1);

    rejectRequest({ data: { message: "Email address could not be accepted" } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Email address could not be accepted");
    expect(screen.getByLabelText("Your name")).toHaveValue("Asha Rao");
    expect(push).not.toHaveBeenCalled();
  });

  it("clears the draft, marks completion, and opens the safe token result after success", async () => {
    saveHealthCheckDraft(reviewDraft());
    submit.mockReturnValue({
      unwrap: () => Promise.resolve({ data: { resultToken: "safe-result-token" } }),
    });
    render(<HealthCheckPage />);

    fireEvent.click(await screen.findByRole("button", { name: /submit health check/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/health-check/results/safe-result-token"));
    expect(localStorage.getItem(HEALTH_CHECK_DRAFT_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(HEALTH_CHECK_WELCOME_KEY) ?? "{}").status).toBe("completed");
  });
});
