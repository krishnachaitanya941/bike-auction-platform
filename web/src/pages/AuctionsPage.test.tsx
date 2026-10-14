import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuctionList } from "../api";
import AuctionsPage from "./AuctionsPage";

const apiMocks = vi.hoisted(() => ({
  listAuctions: vi.fn(),
}));

vi.mock("../api", () => ({
  api: { listAuctions: apiMocks.listAuctions },
}));

vi.mock("../auth", () => ({
  useAuth: () => ({ user: null, logout: vi.fn() }),
}));

const auctionList: AuctionList = {
  serverTime: new Date().toISOString(),
  counts: { live: 1, upcoming: 0, ended: 0 },
  auctions: [
    {
      id: 1,
      status: "live",
      bike: {
        id: 1,
        make: "Honda",
        model: "CB500",
        year: 2022,
        mileageKm: 12000,
        imageUrl: null,
        conditionNotes: null,
      },
      startingPrice: 1000,
      minIncrement: 100,
      currentPrice: 1200,
      minNextBid: 1300,
      highestBidderId: 5,
      bidCount: 2,
      startsAt: new Date(Date.now() - 60_000).toISOString(),
      endsAt: new Date(Date.now() + 60_000).toISOString(),
    },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AuctionsPage />
    </MemoryRouter>
  );
}

afterEach(() => {
  apiMocks.listAuctions.mockReset();
});

describe("AuctionsPage", () => {
  it("renders auction cards", async () => {
    apiMocks.listAuctions.mockResolvedValueOnce(auctionList);
    renderPage();

    expect(await screen.findByText("Honda CB500")).toBeTruthy();
    expect(screen.getByText("2 bids")).toBeTruthy();
  });

  it("shows an empty state when there are no auctions", async () => {
    apiMocks.listAuctions.mockResolvedValueOnce({ ...auctionList, auctions: [] });
    renderPage();

    expect(await screen.findByText("No live auctions right now. Check back soon.")).toBeTruthy();
  });

  it("shows an error and retries the failed request", async () => {
    apiMocks.listAuctions
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce(auctionList);
    renderPage();

    expect((await screen.findByRole("alert")).textContent).toContain("Network unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(apiMocks.listAuctions).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Honda CB500")).toBeTruthy();
  });
});
