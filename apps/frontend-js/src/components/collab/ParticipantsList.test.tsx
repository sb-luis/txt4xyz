import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CLOSE_ROOM_FULL, CLOSE_AT_CAPACITY, CLOSE_INVALID_ROOM_ID } from "@/lib/collab/provider";
import { ParticipantsList } from "./ParticipantsList";

const DISCONNECTED_ROOM = { status: "disconnected" as const, rejectedCode: null, participants: [] };

describe("ParticipantsList", () => {
  it("always renders a trigger so room status is discoverable, even with no other participants", () => {
    render(<ParticipantsList room={DISCONNECTED_ROOM} />);
    expect(screen.getByRole("button", { name: /^room:/ })).toBeTruthy();
  });

  it("shows a loading indicator instead of avatars while not connected, since the participant list can't be shown yet", () => {
    const { rerender } = render(
      <ParticipantsList room={{ status: "connecting", rejectedCode: null, participants: [] }} />,
    );
    expect(screen.getByRole("button", { name: /^room:/ }).getAttribute("aria-label")).toMatch(/connecting/i);
    fireEvent.click(screen.getByRole("button", { name: /^room:/ }));
    expect(screen.getByRole("dialog").textContent).toMatch(/connecting/i);

    rerender(<ParticipantsList room={{ status: "disconnected", rejectedCode: null, participants: [] }} />);
    expect(screen.getByRole("button", { name: /^room:/ }).getAttribute("aria-label")).toMatch(/disconnected/i);
  });

  it("drops the 'connected' label once connected, since seeing the participants implies it", () => {
    render(<ParticipantsList room={{ status: "connected", rejectedCode: null, participants: [] }} />);
    expect(screen.getByRole("button", { name: /^room:/ }).getAttribute("aria-label")).toMatch(/^room: connected$/i);

    fireEvent.click(screen.getByRole("button", { name: /^room:/ }));
    expect(screen.getByRole("dialog").textContent).not.toMatch(/connected/i);
  });

  it("shows a distinct message per rejection code, and a generic fallback for an unknown one", () => {
    const { rerender } = render(
      <ParticipantsList room={{ status: "rejected", rejectedCode: CLOSE_ROOM_FULL, participants: [] }} />,
    );
    expect(screen.getByRole("button", { name: /^room:/ }).getAttribute("aria-label")).toMatch(/room is full/i);

    rerender(<ParticipantsList room={{ status: "rejected", rejectedCode: CLOSE_AT_CAPACITY, participants: [] }} />);
    expect(screen.getByRole("button", { name: /^room:/ }).getAttribute("aria-label")).toMatch(/server at capacity/i);

    rerender(<ParticipantsList room={{ status: "rejected", rejectedCode: CLOSE_INVALID_ROOM_ID, participants: [] }} />);
    expect(screen.getByRole("button", { name: /^room:/ }).getAttribute("aria-label")).toMatch(/invalid room link/i);

    rerender(<ParticipantsList room={{ status: "rejected", rejectedCode: 4999, participants: [] }} />);
    expect(screen.getByRole("button", { name: /^room:/ }).getAttribute("aria-label")).toMatch(/room unavailable/i);
  });

  it("caps visible avatars at 3 and shows an overflow badge for the rest", () => {
    const participants = [
      { clientId: 1, name: "ava" },
      { clientId: 2, name: "bo" },
      { clientId: 3, name: "cy" },
      { clientId: 4, name: "dee" },
      { clientId: 5, name: "eli" },
    ];
    render(<ParticipantsList room={{ status: "connected", rejectedCode: null, participants }} />);

    const trigger = screen.getByRole("button", { name: /^room:/ });
    expect(trigger.textContent).toBe("ABC+2");
  });

  it("opens a popover with just the full participant list once connected", () => {
    const participants = [
      { clientId: 1, name: "ava" },
      { clientId: 2, name: "bo" },
    ];
    render(<ParticipantsList room={{ status: "connected", rejectedCode: null, participants }} />);

    fireEvent.click(screen.getByRole("button", { name: /^room:/ }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toMatch(/ava.*bo/is);
  });
});
