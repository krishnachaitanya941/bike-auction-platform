import { afterEach, describe, expect, it, vi } from "vitest";
import { api, getToken, setToken } from "./api";

afterEach(() => {
  setToken(null);
  vi.unstubAllGlobals();
});

describe("API authentication handling", () => {
  it("clears a saved token and notifies auth state after a 401", async () => {
    const response = {
      ok: false,
      status: 401,
      json: async () => ({
        error: { code: "INVALID_TOKEN", message: "Your session has expired." },
      }),
    } as Response;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    setToken("expired-token");
    const onLogout = vi.fn();
    window.addEventListener("revbid:logout", onLogout);

    await expect(api.me()).rejects.toMatchObject({ status: 401 });

    expect(getToken()).toBeNull();
    expect(onLogout).toHaveBeenCalledTimes(1);
    window.removeEventListener("revbid:logout", onLogout);
  });
});
