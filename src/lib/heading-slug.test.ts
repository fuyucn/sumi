import { describe, expect, test } from "vitest";
import { extractHeadings, headingSlug } from "./heading-slug";

describe("headingSlug", () => {
  test("keeps CJK text and lowercases latin", () => {
    expect(headingSlug("安装与启动")).toBe("安装与启动");
    expect(headingSlug("Getting Started")).toBe("getting-started");
  });

  test("drops punctuation and collapses separators", () => {
    expect(headingSlug("部署 (Docker) & VPS！")).toBe("部署-docker-vps");
    expect(headingSlug("  A  --  B  ")).toBe("a-b");
  });

  test("handles markdown emphasis inside headings", () => {
    expect(headingSlug("**加粗** 标题")).toBe("加粗-标题");
  });
});

describe("extractHeadings", () => {
  test("finds ATX headings with slugs", () => {
    const md = "# 标题一\n\n正文\n\n## 安装 与 启动\n\n### 部署 Docker\n";
    expect(extractHeadings(md)).toEqual([
      { text: "标题一", slug: "标题一" },
      { text: "安装 与 启动", slug: "安装-与-启动" },
      { text: "部署 Docker", slug: "部署-docker" },
    ]);
  });

  test("ignores setext-style and inline code fences", () => {
    const md = "```\n# 不是标题\n```\n\n正文\n\n# 真标题\n";
    expect(extractHeadings(md)).toEqual([{ text: "真标题", slug: "真标题" }]);
  });

  test("matches rendered ids for headings containing links and images", () => {
    const md = "## [官方文档](https://example.com/docs)\n\n![logo](logo.png) 展示\n";
    expect(extractHeadings(md)).toEqual([{ text: "官方文档", slug: "官方文档" }]);
  });
});
