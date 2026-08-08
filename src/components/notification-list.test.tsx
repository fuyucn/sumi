import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { NotificationList, type NotificationItem } from "./notification-list";

vi.mock("@/app/community/actions", () => ({
  markNotificationsReadAction: vi.fn(async () => {}),
}));

const item = (overrides: Partial<NotificationItem> = {}): NotificationItem => ({
  id: "n1",
  type: "like",
  actor: "fuyucn",
  actorName: "Fuyu",
  postHandle: "fuyucn",
  postSlug: "hello",
  dateLabel: "Aug 8",
  read: false,
  ...overrides,
});

test("renders rows, mark-all button and unread summary", () => {
  const html = renderToStaticMarkup(
    <NotificationList notifications={[item(), item({ id: "n2", read: true })]} />,
  );
  expect(html).toContain("Notifications");
  expect(html).toContain("Mark all read");
  expect(html).toContain("1 unread notification");
  expect(html).toContain("Fuyu");
  expect(html).toContain('href="/@fuyucn/hello"');
});

test("marks an unread row with the seal wash and dot", () => {
  const html = renderToStaticMarkup(<NotificationList notifications={[item()]} />);
  expect(html).toContain("bg-seal-wash/25");
  expect(html).toContain("bg-seal");
});

test("renders read rows without the seal dot", () => {
  const html = renderToStaticMarkup(
    <NotificationList notifications={[item({ read: true })]} />,
  );
  expect(html).not.toContain("bg-seal");
  expect(html).not.toContain("Mark all read");
  expect(html).not.toContain("unread notification");
});

test("renders the empty state when there are no notifications", () => {
  const html = renderToStaticMarkup(<NotificationList notifications={[]} />);
  expect(html).toContain("Nothing yet.");
  expect(html).not.toContain("Mark all read");
});
