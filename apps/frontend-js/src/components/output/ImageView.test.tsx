import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ImageView } from "./ImageView";

describe("ImageView", () => {
  it("renders an img with a data URI built from the mime type and base64 payload", () => {
    const { container } = render(<ImageView mime="image/png" dataBase64="AAAA" />);

    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("data:image/png;base64,AAAA");
  });
});
