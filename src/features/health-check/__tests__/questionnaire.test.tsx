import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HEALTH_CHECK_STEPS } from "../config";
import { HealthCheckPage } from "../components/HealthCheckPage";
import { createHealthCheckDraft, saveHealthCheckDraft } from "../storage";
import { HEALTH_CHECK_DRAFT_KEY, HEALTH_CHECK_WELCOME_KEY } from "../storage";

const push = vi.fn();
const createDraft = vi.fn();
const updateDraft = vi.fn();
const finalizeDraft = vi.fn();
const remoteDraft = {
  draftId: "11111111-1111-4111-8111-111111111111",
  draftToken: "opaque-draft-token",
  status: "DRAFT" as const,
  revision: 0,
  createdAt: "2026-10-04T00:00:00Z",
  updatedAt: "2026-10-04T00:00:00Z",
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("../api/healthCheckApi", () => ({
  useCreateHealthCheckDraftMutation: () => [createDraft, { isLoading: false }],
  useUpdateHealthCheckDraftMutation: () => [updateDraft, { isLoading: false }],
  useFinalizeHealthCheckDraftMutation: () => [finalizeDraft, { isLoading: false }],
}));

function reviewDraft() {
  const draft = createHealthCheckDraft();
  draft.step = HEALTH_CHECK_STEPS.length + 1;
  draft.answers = Object.fromEntries(
    HEALTH_CHECK_STEPS.flatMap((step) =>
      step.questions.map((question) => [question.id, question.options[0].value])
    )
  );
  draft.contact = { name: "Asha Rao", email: "asha@example.com", phone: "9876543210", companyName: "Asha Works", location: "Pune" };
  draft.remoteDraft = remoteDraft;
  return draft;
}

describe("HealthCheckPage", () => {
  beforeEach(() => {
    push.mockReset();
    createDraft.mockReset();
    updateDraft.mockReset();
    finalizeDraft.mockReset();
    createDraft.mockReturnValue({ unwrap: () => Promise.resolve({ data: remoteDraft }) });
    updateDraft.mockReturnValue({
      unwrap: () => Promise.resolve({ data: { ...remoteDraft, revision: 1 } }),
    });
  });

  it("starts with owner details and saves them before moving to the short questionnaire", async () => {
    const user = userEvent.setup();
    render(<HealthCheckPage />);
    expect(await screen.findByRole("heading", { name: /who should this report be for/i })).toBeInTheDocument();
    expect(screen.getByText(/about 3 minutes total/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy-policy");

    await user.click(screen.getByRole("button", { name: /save and continue/i }));
    expect(screen.getAllByRole("alert")).toHaveLength(4);

    await user.type(screen.getByLabelText("Your name"), "Asha Rao");
    await user.type(screen.getByLabelText("Work email"), "asha@example.com");
    await user.type(screen.getByLabelText("Phone number"), "9876543210");
    await user.type(screen.getByLabelText("Factory or company"), "Asha Works");
    await user.type(screen.getByLabelText("City or location"), "Pune");
    await user.click(screen.getByRole("button", { name: /save and continue/i }));

    expect(await screen.findByRole("heading", { name: "A quick picture of your factory" })).toBeInTheDocument();
    expect(loadSavedDraft()).toMatchObject({
      step: 1,
      remoteDraft,
      contact: {
        name: "Asha Rao",
        email: "asha@example.com",
        phone: "9876543210",
        companyName: "Asha Works",
        location: "Pune",
      },
    });
    expect(createDraft).toHaveBeenCalledWith(expect.objectContaining({
      contact: expect.objectContaining({ name: "Asha Rao", companyName: "Asha Works" }),
      followUpPreference: "NO_FOLLOW_UP",
      idempotencyKey: expect.any(String),
      website: "",
    }));

    await user.click(screen.getByRole("button", { name: /save and continue/i }));
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    await waitFor(() => expect(document.activeElement).toHaveAttribute("id", "factory_size"));
  });

  it("does not advance or claim success when the draft cannot be saved", async () => {
    const user = userEvent.setup();
    render(<HealthCheckPage />);

    await screen.findByRole("heading", { name: /who should this report be for/i });
    await user.type(screen.getByLabelText("Your name"), "Asha Rao");
    await user.type(screen.getByLabelText("Work email"), "asha@example.com");
    await user.type(screen.getByLabelText("Phone number"), "9876543210");
    await user.type(screen.getByLabelText("Factory or company"), "Asha Works");

    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new DOMException("Storage unavailable", "QuotaExceededError");
    });
    await user.click(screen.getByRole("button", { name: /save and continue/i }));

    expect(screen.getByRole("heading", { name: /who should this report be for/i })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/could not save on this device/i);
    expect(screen.queryByText("Saved on this device")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Your name")).toHaveValue("Asha Rao");
    setItem.mockRestore();
  });

  it("retries contact draft creation with the same idempotency key after a server error", async () => {
    const user = userEvent.setup();
    createDraft.mockReturnValueOnce({
      unwrap: () => Promise.reject({ data: { message: "Draft service is temporarily unavailable" } }),
    });
    render(<HealthCheckPage />);

    await screen.findByRole("heading", { name: /who should this report be for/i });
    await user.type(screen.getByLabelText("Your name"), "Asha Rao");
    await user.type(screen.getByLabelText("Work email"), "asha@example.com");
    await user.type(screen.getByLabelText("Phone number"), "9876543210");
    await user.type(screen.getByLabelText("Factory or company"), "Asha Works");
    await user.click(screen.getByRole("button", { name: /save and continue/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Draft service is temporarily unavailable");
    expect(screen.getByRole("heading", { name: /who should this report be for/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /save and continue/i }));
    expect(await screen.findByRole("heading", { name: /quick picture of your factory/i })).toBeInTheDocument();

    expect(createDraft).toHaveBeenCalledTimes(2);
    expect(createDraft.mock.calls[1][0].idempotencyKey).toBe(createDraft.mock.calls[0][0].idempotencyKey);
  });

  it("prevents duplicate submission and preserves state with an inline backend error", async () => {
    saveHealthCheckDraft(reviewDraft());
    let rejectRequest: (reason?: unknown) => void = () => {};
    const request = new Promise((_resolve, reject) => { rejectRequest = reject; });
    finalizeDraft.mockReturnValue({ unwrap: () => request });
    render(<HealthCheckPage />);

    expect(await screen.findByRole("heading", { name: /review and get your report/i })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy-policy");
    expect(screen.getByText(/not consent for marketing or sales follow-up/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Working days per month")).toHaveValue(26);
    expect(screen.queryByText(/₹|labour cost|cash savings|time-cost/i)).not.toBeInTheDocument();
    const button = screen.getByRole("button", { name: /get my health-check report/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(finalizeDraft).toHaveBeenCalledTimes(1));
    expect(updateDraft).toHaveBeenCalledTimes(1);

    rejectRequest({ data: { message: "Email address could not be accepted" } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Email address could not be accepted");
    expect(screen.getByRole("heading", { name: "Report for Asha Rao" })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("surfaces a stale-revision conflict without finalizing or overwriting the local answers", async () => {
    saveHealthCheckDraft(reviewDraft());
    updateDraft.mockReturnValue({
      unwrap: () => Promise.reject({
        status: 409,
        data: { message: "Health check draft changed; refresh and retry" },
      }),
    });
    render(<HealthCheckPage />);

    fireEvent.click(await screen.findByRole("button", { name: /get my health-check report/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Health check draft changed; refresh and retry");
    expect(finalizeDraft).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Report for Asha Rao" })).toBeInTheDocument();
    expect(loadSavedDraft()).toMatchObject({
      remoteDraft: { revision: 0 },
      answers: expect.objectContaining({ factory_size: "MICRO" }),
    });
  });

  it("clears the draft, marks completion, and opens the safe token result after success", async () => {
    saveHealthCheckDraft(reviewDraft());
    finalizeDraft.mockReturnValue({
      unwrap: () => Promise.resolve({
        data: {
          status: "FINALIZED",
          result: { resultToken: "safe-result-token" },
        },
      }),
    });
    render(<HealthCheckPage />);

    fireEvent.click(await screen.findByRole("button", { name: /get my health-check report/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/health-check/results/safe-result-token"));
    expect(updateDraft).toHaveBeenCalledWith(expect.objectContaining({
      draftToken: remoteDraft.draftToken,
      body: expect.objectContaining({
        schemaVersion: "2026-10-04",
        answers: expect.any(Array),
        expectedRevision: 0,
        projectionInputs: { workingDaysPerMonth: 26 },
      }),
    }));
    expect(updateDraft.mock.calls[0][0].body.projectionInputs).not.toHaveProperty("loadedHourlyLabourCostInr");
    expect(finalizeDraft).toHaveBeenCalledWith(remoteDraft.draftToken);
    expect(localStorage.getItem(HEALTH_CHECK_DRAFT_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(HEALTH_CHECK_WELCOME_KEY) ?? "{}").status).toBe("completed");
  });
});

function loadSavedDraft() {
  return JSON.parse(localStorage.getItem(HEALTH_CHECK_DRAFT_KEY) ?? "null");
}
