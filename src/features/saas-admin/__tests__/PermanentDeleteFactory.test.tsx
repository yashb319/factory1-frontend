import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import authReducer from "@/features/auth/authSlice";
import type { AuthUser, UserRole } from "@/features/auth/types";
import { baseApi } from "@/services/baseApi";
import { SaasFactoriesPage } from "../components/SaasFactoriesPage";
import type {
  FactoryDeletionJob,
  FactoryDeletionPreview,
  SaasAdminDashboard,
  SaasFactory,
} from "../types/saasAdmin.types";

const toastMock = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.factory1.test";
  return { success: vi.fn(), error: vi.fn() };
});
vi.mock("sonner", () => ({ toast: toastMock }));

const API = "https://api.factory1.test";
const DUMMY_ID = "org-dummy";
const HISTORY = "GET /api/saas-admin/factory-deletions?offset=0&limit=50";
const OTHER_ID = "org-other";

function makeFactory(organizationId: string, name: string): SaasFactory {
  return {
    organizationId,
    name,
    email: `${organizationId}@factory.test`,
    phone: null,
    registeredAt: "2026-01-01T00:00:00Z",
    lastLoginAt: null,
    owner: { id: `${organizationId}-owner`, name: `${name} Owner`, email: `owner@${organizationId}.test`, lastLoginAt: null },
    plan: "FREE",
    planMonthlyPrice: 0,
    employeeLimit: 10,
    aiPromptLimit: 10,
    aiPromptWindowMinutes: 60,
    aiUnlimited: false,
    employeeCount: 3,
    aiUsage: { totalPrompts: 5, externalPrompts: 2, localFallbackPrompts: 3, quotaLimitedPrompts: 0, promptsLast24Hours: 0 },
    dbUsage: { totalRecords: 40, users: 4, activeUsers: 2, employees: 3, inventoryItems: 0, stockMovements: 0, products: 0, productionEntries: 0, suppliers: 0, customers: 0, bills: 0, importExportJobs: 0 },
    status: "ACTIVE",
  };
}

const dummy = makeFactory(DUMMY_ID, "Dummy Test Works");
const other = makeFactory(OTHER_ID, "Real Steel Ltd");

function dashboard(factories: SaasFactory[]): SaasAdminDashboard {
  return {
    totalFactories: factories.length,
    totalEmployees: factories.reduce((sum, f) => sum + f.employeeCount, 0),
    totalAiPrompts: 0,
    totalHostedAiPrompts: 0,
    totalDbRecords: 0,
    plans: [],
    offers: [],
    factories,
  };
}

const preview: FactoryDeletionPreview = {
  organizationId: DUMMY_ID,
  factoryName: dummy.name,
  countsByTable: { employees: 3, attendance_records: 30, users: 4 },
  countsByModule: { hr: 33, users: 4 },
  blockers: [],
  confirmationText: "PERMANENTLY DELETE",
};

function job(status: FactoryDeletionJob["status"], extra: Partial<FactoryDeletionJob> = {}): FactoryDeletionJob {
  return {
    organizationId: DUMMY_ID,
    status,
    attempts: 1,
    errorCode: null,
    requestedAt: "2026-10-14T00:00:00Z",
    completedAt: status === "COMPLETED" ? "2026-10-14T00:01:00Z" : null,
    ...extra,
  };
}

const ok = <T,>(data: T, status = 200) =>
  Response.json({ success: true, message: "OK", data }, { status });
const fail = (message: string, status: number) =>
  Response.json({ success: false, message, data: null }, { status });

type Handler = (request: Request) => Response | Promise<Response>;
let routes: Record<string, Handler>;
let factories: SaasFactory[];
const fetchMock = vi.fn<typeof fetch>();

function key(request: Request) {
  return `${request.method} ${request.url.replace(API, "")}`;
}

function calls(route: string) {
  return fetchMock.mock.calls.filter(([input]) => key(input as Request) === route);
}

beforeEach(() => {
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  factories = [dummy, other];
  routes = {
    "GET /api/saas-admin/dashboard": () => ok(dashboard(factories)),
    [`GET /api/saas-admin/factories/${DUMMY_ID}/deletion-preview`]: () => ok(preview),
    [HISTORY]: () => ok([]),
  };
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (input) => {
    const request = input as Request;
    const handler = routes[key(request)];
    if (!handler) throw new Error(`Unexpected request ${key(request)}`);
    return handler(request);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderPage(user: Partial<AuthUser> = {}) {
  const authUser: AuthUser = {
    id: "admin",
    name: "Platform Admin",
    email: "admin@factory1.test",
    role: "SAAS_OWNER",
    status: "ACTIVE",
    organizationId: "platform",
    organizationStatus: "ACTIVE",
    platformAdmin: true,
    ...user,
  };
  const store = configureStore({
    reducer: { auth: authReducer, [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm().concat(baseApi.middleware),
    preloadedState: { auth: { token: "admin-token", user: authUser } },
  });
  render(
    <Provider store={store}>
      <SaasFactoriesPage />
    </Provider>
  );
  return store;
}

function rowFor(name: string) {
  return within(screen.getAllByRole("table", { hidden: true })[0]).getByText(name).closest("tr") as HTMLElement;
}

async function openDialog() {
  const user = userEvent.setup();
  renderPage();
  await screen.findByText(dummy.name);
  await user.click(within(rowFor(dummy.name)).getByRole("button", { name: /delete permanently/i }));
  const dialog = await screen.findByRole("alertdialog");
  await within(dialog).findByLabelText("Deletion preview");
  return { user, dialog };
}

async function fillConfirmation(
  user: ReturnType<typeof userEvent.setup>,
  dialog: HTMLElement,
  { name = dummy.name, phrase = "PERMANENTLY DELETE", scope = /only dummy/i } = {}
) {
  await user.click(within(dialog).getByLabelText(scope));
  await user.type(within(dialog).getByLabelText(/type the factory name/i), name);
  await user.type(within(dialog).getByLabelText(/to confirm permanent deletion/i), phrase);
}

const deleteButton = (dialog: HTMLElement) =>
  within(dialog).getByRole("button", { name: /permanently delete|deleting/i });

const POST_DELETE = `POST /api/saas-admin/factories/${DUMMY_ID}/permanent-deletion`;

describe("permanent factory deletion – role gating", () => {
  it.each<[UserRole, boolean | undefined]>([
    ["OWNER", undefined],
    ["ADMIN", false],
    ["EMPLOYEE", false],
    ["PARTNER_ADMIN", false],
    ["SAAS_OWNER", false],
  ])("hides the action and loads nothing for %s without platformAdmin", async (role, platformAdmin) => {
    renderPage({ role, platformAdmin });
    expect(screen.getByText(/only available for Factory1 platform administrators/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete permanently/i })).not.toBeInTheDocument();
    await act(async () => {});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("offers the action to platform admins separately from Terminate", async () => {
    renderPage();
    await screen.findByText(dummy.name);
    const row = rowFor(dummy.name);
    expect(within(row).getByRole("button", { name: /delete permanently/i })).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: /terminate/i })).toBeInTheDocument();
  });
});

describe("permanent factory deletion – confirmation", () => {
  it("opens without deleting, shows identity, warnings and server preview, and focuses no destructive control", async () => {
    const { dialog } = await openDialog();
    expect(calls(POST_DELETE)).toHaveLength(0);
    expect(within(dialog).getByLabelText("Factory to delete")).toHaveTextContent(dummy.name);
    expect(within(dialog).getByLabelText("Factory to delete")).toHaveTextContent(dummy.owner!.email);
    expect(dialog).toHaveTextContent(/irreversible/i);
    expect(within(dialog).getByLabelText("Deletion preview")).toHaveTextContent("37 records across 3 tables");
    expect(within(dialog).getByLabelText("Deletion preview")).toHaveTextContent("Hr");
    expect(deleteButton(dialog)).toBeDisabled();
    expect(document.activeElement).not.toBe(deleteButton(dialog));
  });

  it("distinguishes a dummy complete purge from real live-data deletion with a retained archive", async () => {
    routes[`GET /api/saas-admin/factories/${DUMMY_ID}/deletion-preview`] = () =>
      ok({ ...preview, realDeletionPolicyConfigured: true });
    const { user, dialog } = await openDialog();
    await user.click(within(dialog).getByLabelText(/only dummy/i));
    expect(dialog).toHaveTextContent("complete purge");
    expect(dialog).toHaveTextContent(/uploaded files/i);
    expect(dialog).toHaveTextContent(/user accounts/i);
    expect(dialog).toHaveTextContent("Everything above is permanently erased");

    await user.click(within(dialog).getByLabelText(/real business data/i));
    expect(dialog).toHaveTextContent("restricted retention archive");
    expect(dialog).toHaveTextContent(/legal hold/i);
    expect(dialog).toHaveTextContent(/reviewed retention policy bound to this factory/i);
    expect(dialog).not.toHaveTextContent(/permanently erased/i);
  });

  it("requires exact case-sensitive name, exact phrase and a data choice", async () => {
    const { user, dialog } = await openDialog();
    await fillConfirmation(user, dialog, { name: dummy.name.toLowerCase() });
    expect(deleteButton(dialog)).toBeDisabled();

    const nameInput = within(dialog).getByLabelText(/type the factory name/i);
    await user.clear(nameInput);
    await user.type(nameInput, dummy.name);
    const phraseInput = within(dialog).getByLabelText(/to confirm permanent deletion/i);
    await user.clear(phraseInput);
    await user.type(phraseInput, "permanently delete");
    expect(deleteButton(dialog)).toBeDisabled();

    await user.clear(phraseInput);
    await user.type(phraseInput, "PERMANENTLY DELETE");
    expect(deleteButton(dialog)).toBeEnabled();
    expect(calls(POST_DELETE)).toHaveLength(0);
  });

  it("does not submit on Enter", async () => {
    const { user, dialog } = await openDialog();
    await fillConfirmation(user, dialog);
    await user.type(within(dialog).getByLabelText(/to confirm permanent deletion/i), "{Enter}");
    await user.type(within(dialog).getByLabelText(/type the factory name/i), "{Enter}");
    expect(calls(POST_DELETE)).toHaveLength(0);
  });

  it("cancel closes without any deletion request", async () => {
    const { user, dialog } = await openDialog();
    await fillConfirmation(user, dialog);
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(calls(POST_DELETE)).toHaveLength(0);
    expect(screen.getByText(dummy.name)).toBeInTheDocument();
  });

  it("shows backend blockers and keeps deletion disabled", async () => {
    routes[`GET /api/saas-admin/factories/${DUMMY_ID}/deletion-preview`] = () =>
      ok({ ...preview, blockers: ["PROTECTED_ORGANIZATION", "SHARED_REFERENCE:invoices"] });
    const { user, dialog } = await openDialog();
    expect(dialog).toHaveTextContent("Deletion is blocked");
    expect(dialog).toHaveTextContent("protected platform organization");
    expect(dialog).toHaveTextContent("Shared platform records reference this factory (invoices)");
    await fillConfirmation(user, dialog);
    expect(deleteButton(dialog)).toBeDisabled();
  });

  it("keeps deletion disabled when the preview cannot be loaded and allows retrying it", async () => {
    let attempt = 0;
    routes[`GET /api/saas-admin/factories/${DUMMY_ID}/deletion-preview`] = () =>
      ++attempt === 1 ? fail("Preview unavailable", 500) : ok(preview);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(dummy.name);
    await user.click(within(rowFor(dummy.name)).getByRole("button", { name: /delete permanently/i }));
    const dialog = await screen.findByRole("alertdialog");
    expect(await within(dialog).findByText(/Preview unavailable/)).toBeInTheDocument();
    expect(deleteButton(dialog)).toBeDisabled();
    await user.click(within(dialog).getByRole("button", { name: /retry preview/i }));
    expect(await within(dialog).findByLabelText("Deletion preview")).toBeInTheDocument();
  });
});

describe("permanent factory deletion – submission", () => {
  it("sends the exact contract once, disables while in flight and ignores duplicate clicks", async () => {
    let resolve!: (response: Response) => void;
    routes[POST_DELETE] = () => new Promise((r) => (resolve = r));
    const { user, dialog } = await openDialog();
    await fillConfirmation(user, dialog);
    const button = deleteButton(dialog);
    await user.click(button);
    await user.click(button);
    await waitFor(() => expect(calls(POST_DELETE)).toHaveLength(1));
    expect(deleteButton(dialog)).toBeDisabled();
    expect(deleteButton(dialog)).toHaveTextContent("Deleting...");
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(within(dialog).getByLabelText(/type the factory name/i)).toBeDisabled();

    const request = calls(POST_DELETE)[0][0] as Request;
    expect(request.headers.get("authorization")).toBe("Bearer admin-token");
    expect(await request.clone().json()).toEqual({
      factoryName: dummy.name,
      confirmation: "PERMANENTLY DELETE",
      dummyDataOnly: true,
    });

    factories = [other];
    await act(async () => resolve(ok(job("COMPLETED"))));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(calls(POST_DELETE)).toHaveLength(1);
  });

  it("disables real-data deletion when no reviewed retention policy is configured", async () => {
    const { user, dialog } = await openDialog();
    expect(within(dialog).getByLabelText(/real business data/i)).toBeDisabled();
    expect(dialog).toHaveTextContent(/no reviewed retention policy is configured/i);
    await fillConfirmation(user, dialog);
    expect(within(dialog).queryByLabelText(/retention policy id/i)).not.toBeInTheDocument();
  });

  it("requires a retention policy ID for real data, sends it, and shows the backend rejection while preserving input", async () => {
    routes[`GET /api/saas-admin/factories/${DUMMY_ID}/deletion-preview`] = () =>
      ok({ ...preview, realDeletionPolicyConfigured: true });
    routes[POST_DELETE] = () => fail("REAL_DATA_RETENTION_POLICY_REQUIRED", 409);
    const { user, dialog } = await openDialog();
    await fillConfirmation(user, dialog, { scope: /real business data/i });
    expect(deleteButton(dialog)).toBeDisabled();
    await user.type(within(dialog).getByLabelText(/retention policy id/i), "in-gst-8y");
    await user.click(deleteButton(dialog));
    expect(await within(dialog).findByText(/not enabled until the data retention policy is finalized/i)).toBeInTheDocument();
    const request = calls(POST_DELETE)[0][0] as Request;
    expect(await request.clone().json()).toEqual({
      factoryName: dummy.name,
      confirmation: "PERMANENTLY DELETE",
      dummyDataOnly: false,
      retentionPolicyId: "in-gst-8y",
    });
    expect(within(dialog).getByLabelText(/type the factory name/i)).toHaveValue(dummy.name);
    expect(within(dialog).getByLabelText(/to confirm permanent deletion/i)).toHaveValue("PERMANENTLY DELETE");
    expect(deleteButton(dialog)).toBeEnabled();
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(screen.getByText(dummy.name, { selector: "div" })).toBeInTheDocument();
  });

  it("on COMPLETED with a retained archive never claims full erasure and shows archive details", async () => {
    routes[`GET /api/saas-admin/factories/${DUMMY_ID}/deletion-preview`] = () =>
      ok({ ...preview, realDeletionPolicyConfigured: true });
    routes[POST_DELETE] = () => {
      factories = [other];
      return ok(
        job("COMPLETED", {
          retention: {
            archiveId: "arch-1",
            policyId: "in-gst-8y",
            jurisdiction: "IN",
            retainUntil: "2034-03-31",
            legalHold: true,
            categories: { invoices: 12, payroll_records: 5 },
            integrityHash: "abc123",
          },
        })
      );
    };
    const { user, dialog } = await openDialog();
    await fillConfirmation(user, dialog, { scope: /real business data/i });
    await user.type(within(dialog).getByLabelText(/retention policy id/i), "in-gst-8y");
    await user.click(deleteButton(dialog));

    const archive = await within(dialog).findByLabelText("Retained archive");
    expect(archive).toHaveTextContent("2034-03-31");
    expect(archive).toHaveTextContent("IN");
    expect(archive).toHaveTextContent(/Active - purge blocked/);
    expect(archive).toHaveTextContent("Invoices");
    expect(archive).toHaveTextContent("12");
    expect(dialog).toHaveTextContent("required records remain in the restricted retention archive");
    expect(dialog).not.toHaveTextContent("The factory, its data and its files were removed");
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining("retention archive"));
    expect(toastMock.success).not.toHaveBeenCalledWith(expect.stringContaining("all its data"));
    await waitFor(() =>
      expect(within(screen.getAllByRole("table", { hidden: true })[0]).queryByText(dummy.name)).not.toBeInTheDocument()
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("keeps the dialog and context when the provider/network fails", async () => {
    routes[POST_DELETE] = () => {
      throw new TypeError("Failed to fetch");
    };
    const { user, dialog } = await openDialog();
    await fillConfirmation(user, dialog);
    await user.click(deleteButton(dialog));
    await waitFor(() => expect(dialog).toHaveTextContent(/Failed to fetch|did not confirm/i));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/type the factory name/i)).toHaveValue(dummy.name);
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it("on COMPLETED removes only the deleted factory, refreshes the list and announces success", async () => {
    routes[POST_DELETE] = () => {
      factories = [other];
      return ok(job("COMPLETED"));
    };
    const { user, dialog } = await openDialog();
    const dashboardCallsBefore = calls("GET /api/saas-admin/dashboard").length;
    await fillConfirmation(user, dialog);
    await user.click(deleteButton(dialog));
    await waitFor(() => expect(screen.queryByText(dummy.name)).not.toBeInTheDocument());
    expect(screen.getByText(other.name)).toBeInTheDocument();
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining("permanently deleted"));
    await waitFor(() =>
      expect(calls("GET /api/saas-admin/dashboard").length).toBeGreaterThan(dashboardCallsBefore)
    );
  });

  it("shows cleanup failure accurately, never as completed, and retries asset cleanup", async () => {
    routes[POST_DELETE] = () => {
      factories = [{ ...dummy, deletionStatus: "ASSET_CLEANUP_FAILED" }, other];
      return ok(job("ASSET_CLEANUP_FAILED", { errorCode: "STORAGE_DELETE_FAILED" }), 202);
    };
    let resolveRetry!: (response: Response) => void;
    routes[`POST /api/saas-admin/factory-deletions/${DUMMY_ID}/retry-assets`] = () =>
      new Promise((r) => (resolveRetry = r));
    const { user, dialog } = await openDialog();
    await fillConfirmation(user, dialog);
    await user.click(deleteButton(dialog));

    expect(await within(dialog).findByText("Deletion is not complete.")).toBeInTheDocument();
    expect(dialog).toHaveTextContent("STORAGE_DELETE_FAILED");
    expect(dialog).not.toHaveTextContent("Deletion completed");
    expect(toastMock.success).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(within(rowFor(dummy.name)).getByText("Deletion failed")).toBeInTheDocument()
    );
    expect(within(rowFor(dummy.name)).queryByRole("button", { name: /suspend/i, hidden: true })).not.toBeInTheDocument();

    const retry = within(dialog).getByRole("button", { name: /retry file cleanup/i });
    await user.click(retry);
    await user.click(retry);
    expect(calls(`POST /api/saas-admin/factory-deletions/${DUMMY_ID}/retry-assets`)).toHaveLength(1);
    factories = [other];
    await act(async () => resolveRetry(ok(job("COMPLETED", { attempts: 2 }))));
    await waitFor(() => expect(screen.queryByText(dummy.name)).not.toBeInTheDocument());
    expect(toastMock.success).toHaveBeenCalledTimes(1);
  });

  it(
    "shows pending cleanup as in progress, locks the row, and polls until the backend reports completion",
    async () => {
      routes[POST_DELETE] = () => {
        factories = [{ ...dummy, deletionStatus: "ASSET_CLEANUP_PENDING" }, other];
        return ok(job("ASSET_CLEANUP_PENDING"), 202);
      };
      let polls = 0;
      routes[`GET /api/saas-admin/factory-deletions/${DUMMY_ID}`] = () => {
        if (++polls === 1) return ok(job("ASSET_CLEANUP_PENDING"));
        factories = [other];
        return ok(job("COMPLETED"));
      };
      const { user, dialog } = await openDialog();
      await fillConfirmation(user, dialog);
      await user.click(deleteButton(dialog));

      expect(await within(dialog).findByText("Deletion in progress")).toBeInTheDocument();
      expect(dialog).toHaveTextContent("not fully deleted yet");
      expect(toastMock.success).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(within(rowFor(dummy.name)).getByRole("button", { name: /deletion status/i, hidden: true })).toBeInTheDocument()
      );
      expect(within(rowFor(dummy.name)).queryByRole("button", { name: /terminate/i, hidden: true })).not.toBeInTheDocument();

      await waitFor(() => expect(screen.queryByText(dummy.name)).not.toBeInTheDocument(), {
        timeout: 6000,
      });
      expect(polls).toBe(2);
      expect(toastMock.success).toHaveBeenCalledTimes(1);
      expect(screen.getByText(other.name)).toBeInTheDocument();
    },
    10000
  );
});

describe("permanent factory deletion – paid subscription blocker", () => {
  it("is never cleared by a dummy attestation, only by a real archived deletion under a reviewed policy", async () => {
    routes[`GET /api/saas-admin/factories/${DUMMY_ID}/deletion-preview`] = () =>
      ok({ ...preview, blockers: ["PAID_SUBSCRIPTION_REQUIRES_POLICY"], realDeletionPolicyConfigured: true });
    routes[POST_DELETE] = () => ok(job("ASSET_CLEANUP_PENDING"), 202);
    routes[`GET /api/saas-admin/factory-deletions/${DUMMY_ID}`] = () => ok(job("ASSET_CLEANUP_PENDING"));
    const { user, dialog } = await openDialog();
    await fillConfirmation(user, dialog);
    expect(dialog).toHaveTextContent("Deletion is blocked");
    expect(deleteButton(dialog)).toBeDisabled();

    await user.click(within(dialog).getByLabelText(/real business data/i));
    await user.type(within(dialog).getByLabelText(/retention policy id/i), "in-gst-8y");
    expect(dialog).not.toHaveTextContent("Deletion is blocked");
    expect(dialog).toHaveTextContent(/kept in the restricted retention archive/i);
    await user.click(deleteButton(dialog));
    await waitFor(() => expect(calls(POST_DELETE)).toHaveLength(1));
    const body = await (calls(POST_DELETE)[0][0] as Request).clone().json();
    expect(body).toMatchObject({ dummyDataOnly: false, retentionPolicyId: "in-gst-8y" });
  });

  it("stays blocked for real data when no reviewed policy is configured", async () => {
    routes[`GET /api/saas-admin/factories/${DUMMY_ID}/deletion-preview`] = () =>
      ok({ ...preview, blockers: ["PAID_SUBSCRIPTION_REQUIRES_POLICY"] });
    const { dialog } = await openDialog();
    expect(within(dialog).getByLabelText(/real business data/i)).toBeDisabled();
    expect(dialog).toHaveTextContent("Deletion is blocked");
  });
});

describe("permanent factory deletion – durable history", () => {
  it("lists recorded deletions by organization ID and lets a failed cleanup be retried after reload", async () => {
    const GONE_ID = "9b1c-gone";
    const failedJob = { ...job("ASSET_CLEANUP_FAILED", { errorCode: "STORAGE_DELETE_FAILED", attempts: 2 }), organizationId: GONE_ID };
    const archived = {
      ...job("COMPLETED"),
      organizationId: "7a2d-archived",
      retention: { archiveId: "a1", policyId: "p1", jurisdiction: "IN", retainUntil: "2034-03-31", legalHold: true, categories: { invoices: 3 }, integrityHash: "h" },
    };
    routes[HISTORY] = () => ok([failedJob, archived]);
    routes[`GET /api/saas-admin/factory-deletions/${GONE_ID}`] = () => ok(failedJob);
    let resolveRetry!: (response: Response) => void;
    routes[`POST /api/saas-admin/factory-deletions/${GONE_ID}/retry-assets`] = () =>
      new Promise((r) => (resolveRetry = r));

    const user = userEvent.setup();
    renderPage();
    const history = await screen.findByRole("region", { name: "Factory deletion history" });
    expect(await within(history).findByText(GONE_ID)).toBeInTheDocument();
    expect(within(history).getByText("File cleanup failed")).toBeInTheDocument();
    expect(within(history).getByText("Until 2034-03-31 • legal hold")).toBeInTheDocument();

    await user.click(within(history).getByRole("button", { name: /review \/ retry/i }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(GONE_ID);
    expect(dialog).toHaveTextContent("Deletion is not complete.");
    expect(dialog).toHaveTextContent("STORAGE_DELETE_FAILED");

    const retry = within(dialog).getByRole("button", { name: /retry file cleanup/i });
    await user.click(retry);
    await user.click(retry);
    expect(calls(`POST /api/saas-admin/factory-deletions/${GONE_ID}/retry-assets`)).toHaveLength(1);
    routes[HISTORY] = () => ok([{ ...failedJob, status: "COMPLETED", errorCode: null }, archived]);
    routes[`GET /api/saas-admin/factory-deletions/${GONE_ID}`] = () => ok({ ...failedJob, status: "COMPLETED", errorCode: null });
    await act(async () => resolveRetry(ok({ ...failedJob, status: "COMPLETED", errorCode: null })));
    expect(await within(dialog).findByText(/Deletion completed/)).toBeInTheDocument();
    await waitFor(() => expect(within(history).queryByText("File cleanup failed")).not.toBeInTheDocument());
  });

  it("shows a visible error when history cannot be loaded", async () => {
    routes[HISTORY] = () => fail("History unavailable", 500);
    renderPage();
    const history = await screen.findByRole("region", { name: "Factory deletion history" });
    expect(await within(history).findByText(/History unavailable/)).toBeInTheDocument();
  });
});
