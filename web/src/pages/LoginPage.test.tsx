import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api";
import LoginPage from "./LoginPage";

const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
}));

vi.mock("../auth", () => ({
  useAuth: () => ({ user: null, login: authMocks.login, register: authMocks.register }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

afterEach(() => {
  authMocks.login.mockReset();
  authMocks.register.mockReset();
});

describe("LoginPage", () => {
  it("shows field errors returned with a 422 response", async () => {
    authMocks.register.mockRejectedValueOnce(
      new ApiError(422, "VALIDATION_ERROR", "Please check the highlighted fields.", [
        { field: "name", message: "Name is too short" },
        { field: "email", message: "Enter a valid email" },
      ])
    );
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Register" }));
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "invalid" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Name is too short")).toBeTruthy();
    expect(screen.getByText("Enter a valid email")).toBeTruthy();
  });

  it("shows a general error returned with a 401 response", async () => {
    authMocks.login.mockRejectedValueOnce(
      new ApiError(401, "INVALID_CREDENTIALS", "That email or password does not look right.")
    );
    renderPage();
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "demo@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "incorrect" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Sign in" })[1]);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "That email or password does not look right."
    );
  });
});
