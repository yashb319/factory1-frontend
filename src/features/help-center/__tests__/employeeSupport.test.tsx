import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import authReducer, { setCredentials } from "@/features/auth/authSlice";
import type { AuthUser } from "@/features/auth/types";
import { baseApi } from "@/services/baseApi";
import { AuthGuard, isEmployeePortalPath } from "@/features/auth/components/AuthGuard";
import { canAccessNavigationItem, navigationItems } from "@/config/navigation";
import { visibleShortcuts } from "@/config/shortcuts";
import { HelpCenterPage } from "../components/HelpCenterPage";
import { contactSupportApi } from "../api/contactSupportApi";
import { contactSupportSchema, SUPPORT_ISSUE_TYPES } from "../contactSupport";

const navigation = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.factory1.test";
  return { pathname: "/help", replace: vi.fn() };
});
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace }),
}));

const employee: AuthUser = {
  id: "employee-a", name: "Employee A", email: "employee.a@company.in",
  role: "EMPLOYEE", status: "ACTIVE", organizationId: "org-a",
  organizationStatus: "ACTIVE",
};
const body = {
  name: employee.name, companyEmail: employee.email,
  issueType: "ATTENDANCE" as const, description: "My check-in is missing.",
};
const confirmation = { success: true, message: "Your message has been sent to support.", data: null };

function createStore(user = employee) {
  return configureStore({
    reducer: { auth: authReducer, [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
    preloadedState: { auth: { token: "employee-session-token", user } },
  });
}

function renderHelp(user = employee) {
  const store = createStore(user);
  render(<Provider store={store}><HelpCenterPage /></Provider>);
  return store;
}

async function fillIssue() {
  const user = userEvent.setup();
  await user.selectOptions(screen.getByLabelText("Issue type"), "ATTENDANCE");
  await user.type(screen.getByLabelText("Description"), body.description);
  return user;
}

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  navigation.pathname = "/help";
  navigation.replace.mockClear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("employee support form", () => {
  it("sends only the exact contract with the current employee Bearer session and waits for confirmation", async () => {
    let resolveRequest!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve; }));
    renderHelp();
    expect(screen.getByLabelText("Name")).toHaveValue(employee.name);
    expect(screen.getByLabelText("Name")).toHaveAttribute("maxlength", "120");
    expect(screen.getByLabelText("Company email")).toHaveValue(employee.email);
    expect(screen.getByLabelText("Company email")).toHaveAttribute("maxlength", "254");
    expect(screen.getByLabelText("Description")).toHaveAttribute("maxlength", "5000");
    const user = await fillIssue();
    const submit = screen.getByRole("button", { name: "Send message" });
    await user.click(submit);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();
    expect(screen.getByLabelText("Description")).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Sending your message");
    expect(screen.queryByText(confirmation.message)).not.toBeInTheDocument();
    fireEvent.submit(submit.closest("form")!);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toBe("https://api.factory1.test/api/employee-portal/help/contact");
    expect(request.method).toBe("POST");
    expect(request.headers.get("authorization")).toBe("Bearer employee-session-token");
    expect(await request.json()).toEqual(body);
    await act(async () => resolveRequest(Response.json(confirmation)));
    expect(await screen.findByRole("status")).toHaveTextContent(confirmation.message);
    expect(screen.queryByRole("button", { name: "Send message" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send another message" }));
    expect(screen.getByLabelText("Description")).toHaveValue("");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("validates required fields and email with accessible errors without calling the API", async () => {
    renderHelp();
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("Name"));
    await user.clear(screen.getByLabelText("Company email"));
    await user.type(screen.getByLabelText("Company email"), "invalid");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByText("Enter your name.")).toBeVisible();
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Company email")).toHaveAccessibleDescription("Enter a valid company email.");
    expect(screen.getByText("Choose an issue type.")).toBeVisible();
    expect(screen.getByText("Describe your issue.")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([400, 403, 413, 429, 503])("retains the draft and reports HTTP %s failures without retrying", async (status) => {
    fetchMock.mockResolvedValue(Response.json({ success: false, message: "Please try again later.", data: null }, { status }));
    renderHelp();
    const user = await fillIssue();
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please try again later.");
    expect(screen.getByLabelText("Description")).toHaveValue(body.description);
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
    expect(screen.queryByText(confirmation.message)).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces network failure and permits only an explicit retry", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network unavailable"));
    renderHelp();
    const user = await fillIssue();
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Network unavailable");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockResolvedValueOnce(Response.json(confirmation));
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByRole("status")).toHaveTextContent(confirmation.message);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not show another employee's draft or late confirmation after switching accounts", async () => {
    let resolveRequest!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve; }));
    const store = renderHelp();
    const user = await fillIssue();
    await user.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    act(() => {
      store.dispatch(setCredentials({
        token: "different-token",
        user: { ...employee, id: "employee-b", name: "Employee B", email: "b@company.in", organizationId: "org-b" },
      }));
    });
    expect(screen.getByLabelText("Name")).toHaveValue("Employee B");
    expect(screen.getByLabelText("Company email")).toHaveValue("b@company.in");
    expect(screen.getByLabelText("Description")).toHaveValue("");
    await act(async () => resolveRequest(Response.json(confirmation)));
    expect(screen.queryByText(confirmation.message)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
  });
});

describe("support API confirmation", () => {
  it.each([
    { success: false, message: "Not delivered", data: null },
    { message: confirmation.message },
    { success: true, message: "", data: null },
    { success: true, message: confirmation.message, data: {} },
  ])("rejects unconfirmed or malformed HTTP 200 responses: %j", async (response) => {
    fetchMock.mockResolvedValue(Response.json(response));
    const store = createStore();
    const request = store.dispatch(contactSupportApi.endpoints.contactEmployeeSupport.initiate(body));
    await expect(request.unwrap()).rejects.toMatchObject({ status: "CUSTOM_ERROR" });
    request.reset();
  });
});

describe("support validation and employee access", () => {
  it("uses exact backend issue values, trims text, and accepts multiline descriptions", () => {
    expect(SUPPORT_ISSUE_TYPES.map((issue) => issue.value)).toEqual([
      "ATTENDANCE", "LEAVE", "PAYROLL", "ACCOUNT_ACCESS", "TECHNICAL", "OTHER",
    ]);
    expect(contactSupportSchema.parse({ ...body, name: " Employee A ", description: " First line\n\tSecond line " }))
      .toMatchObject({ name: "Employee A", description: "First line\n\tSecond line" });
  });

  it("enforces field bounds and rejects invalid controls, blanks and enum values", () => {
    const maxEmail = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`;
    expect(maxEmail).toHaveLength(254);
    expect(contactSupportSchema.safeParse({ ...body, name: "N".repeat(120), companyEmail: maxEmail, description: "D".repeat(5000) }).success).toBe(true);
    for (const invalid of [
      { name: "N".repeat(121) }, { companyEmail: `${maxEmail}a` },
      { description: "D".repeat(5001) }, { name: "   " }, { description: " \n\t " },
      { name: "Name\nInjected" }, { companyEmail: "a@company.in\r\nInjected" },
      { name: "Name\u0000" }, { description: "Text\u0007" },
      { companyEmail: "not-an-email" }, { issueType: "WORK_ORDERS" },
    ]) {
      expect(contactSupportSchema.safeParse({ ...body, ...invalid }).success).toBe(false);
    }
  });

  it("allows employee help but not direct AI, and preserves AI links for organization roles", () => {
    expect(isEmployeePortalPath("/help")).toBe(true);
    expect(isEmployeePortalPath("/ai")).toBe(false);
    expect(isEmployeePortalPath("/ai/conversations/123")).toBe(false);
    const ai = navigationItems.find((item) => item.href === "/ai")!;
    expect(canAccessNavigationItem(ai, employee)).toBe(false);
    expect(visibleShortcuts(employee).some((shortcut) => shortcut.href === "/ai")).toBe(false);
    for (const role of ["OWNER", "ADMIN", "FINANCE", "MANAGEMENT"] as const) {
      expect(canAccessNavigationItem(ai, { ...employee, role })).toBe(true);
    }
  });

  it("blocks employee AI content before redirecting, while allowing employee Help Center", async () => {
    localStorage.setItem("factory1_last_activity_at", String(Date.now()));
    const store = createStore();
    navigation.pathname = "/ai";
    const { rerender } = render(
      <Provider store={store}><AuthGuard><p>Protected content</p></AuthGuard></Provider>
    );
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/dashboard"));
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    navigation.pathname = "/help";
    rerender(<Provider store={store}><AuthGuard><p>Protected content</p></AuthGuard></Provider>);
    expect(screen.getByText("Protected content")).toBeVisible();
  });

  it("preserves the existing non-employee Help Center", () => {
    renderHelp({ ...employee, role: "OWNER" });
    expect(screen.queryByLabelText("Company email")).not.toBeInTheDocument();
    expect(screen.getByText("Factory1 Help Center")).toBeVisible();
  });
});
