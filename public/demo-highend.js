  document.documentElement.classList.add("js");

  // Theme toggle
  const root = document.documentElement;
  const themeBtn = document.getElementById("themeToggle");
  themeBtn.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  });

  // Hamburger morph + glass overlay
  const burger = document.getElementById("hamburger");
  const overlay = document.getElementById("menuOverlay");
  const setMenu = (open) => {
    burger.dataset.open = String(open);
    burger.setAttribute("aria-expanded", String(open));
    overlay.dataset.open = String(open);
    overlay.setAttribute("aria-hidden", String(!open));
  };
  burger.addEventListener("click", () => setMenu(burger.dataset.open !== "true"));
  overlay.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => setMenu(false)),
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && burger.dataset.open === "true") setMenu(false);
  });

  // Scroll reveal
  if (new URLSearchParams(location.search).has("preview")) {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in-view"));
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("in-view");
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.14, rootMargin: "0px 0px -6% 0px" },
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  // Year rail scrollspy (posts page)
  const yearLinks = [...document.querySelectorAll(".archive-rail a")];
  if (yearLinks.length) {
    const groups = yearLinks.map((a) => document.querySelector(a.getAttribute("href")));
    const spy = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            yearLinks.forEach((l) => l.classList.remove("on"));
            const link = yearLinks[groups.indexOf(e.target)];
            if (link) link.classList.add("on");
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    groups.forEach((g) => g && spy.observe(g));
  }

  // Reading progress (article pages)
  const bar = document.querySelector(".progress-bar");
  if (bar) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      bar.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
    };
    if (reduce) {
      bar.style.display = "none";
    } else {
      window.addEventListener("scroll", update, { passive: true });
      update();
    }
  }

  // Tag search filter
  const tagSearch = document.querySelector(".tag-search");
  if (tagSearch) {
    tagSearch.addEventListener("input", () => {
      const q = tagSearch.value.trim().toLowerCase();
      document.querySelectorAll(".tag[data-tag]").forEach((el) => {
        el.hidden = q.length > 0 && !el.dataset.tag.includes(q);
      });
    });
  }

  // TOC scroll spy
  const tocLinks = [...document.querySelectorAll(".toc a[href^='#']")];
  if (tocLinks.length) {
    const map = new Map(
      tocLinks.map((a) => [document.querySelector(a.getAttribute("href")), a]),
    );
    const spy = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            tocLinks.forEach((a) => a.classList.remove("on"));
            const link = map.get(e.target);
            if (link) link.classList.add("on");
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    map.forEach((_, section) => spy.observe(section));
  }
