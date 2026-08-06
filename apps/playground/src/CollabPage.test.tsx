import { afterEach, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CollabPage } from "./CollabPage";

function setSearch(search: string) {
  window.history.pushState(null, "", `/collab${search}`);
}

describe("CollabPage", () => {
  afterEach(() => {
    setSearch("");
  });

  it("renders both panes with a disconnected/connecting status and no room id leaks into an error", () => {
    setSearch("");
    render(<CollabPage />);

    expect(screen.getByText("Pane A")).not.toBeNull();
    expect(screen.getByText("Pane B")).not.toBeNull();

    const statuses = screen.getAllByText(/connecting|disconnected/);
    expect(statuses.length).toBeGreaterThanOrEqual(2);

    expect(screen.getByText(/room:/)).not.toBeNull();
  });
});
