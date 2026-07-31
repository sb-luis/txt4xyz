import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JsonView } from "./JsonView";

describe("JsonView", () => {
  it("renders the value as pretty-printed JSON text", () => {
    const { container } = render(<JsonView value={{ a: 1, b: [1, 2] }} />);
    expect(container.textContent).toBe(JSON.stringify({ a: 1, b: [1, 2] }, null, 2));
  });
});
