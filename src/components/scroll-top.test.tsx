import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { ScrollTop } from "./scroll-top";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

test("renders nothing on the server (scroll position unknown)", () => {
  const html = renderToStaticMarkup(<ScrollTop />);
  expect(html).toBe("");
});
