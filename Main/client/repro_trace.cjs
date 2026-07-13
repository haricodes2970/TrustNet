const { chromium } = require("playwright-core");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE = "http://localhost:5173";

(async () => {
  const browser = await chromium.launch({
    executablePath: EDGE,
    headless: true,
    args: ["--no-sandbox"],
  });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  page.on("console", (msg) => console.log("[BROWSER] " + msg.text()));
  page.on("pageerror", (e) => console.log("[PAGEERROR] " + e.message));

  // Log EVERY network request + response to /api
  page.on("request", (req) => {
    const u = req.url();
    if (u.includes("/api/")) console.log("[NET →] " + req.method() + " " + u.replace(BASE, ""));
  });
  page.on("response", (res) => {
    const u = res.url();
    if (u.includes("/api/")) console.log("[NET ←] " + res.status() + " " + res.request().method() + " " + u.replace(BASE, ""));
  });
  page.on("framenavigated", (f) => { if (f === page.mainFrame()) console.log("[NAV] -> " + f.url()); });

  const email = "trace.kilo." + Date.now() + "@example.com";
  const password = "password123";

  try {
    await page.addInitScript(() => {
      const orig = Object.getOwnPropertyDescriptor(window.location, "href");
      let _href = window.location.href;
      Object.defineProperty(window.location, "href", {
        configurable: true,
        get() { return _href; },
        set(v) { console.log("[HARD REDIRECT] window.location.href = " + v); _href = v; },
      });
    });

    // Seed a STALE (invalid) token + cookie, like a browser from the mock era
    await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.setItem("token", "c2FyYWhAZXhhbXBsZS5jb206MTcwMDAwMDAwMDAw");
      document.cookie = "trustnet_refresh=c2FyYWhAZXhhbXBsZS5jb206MTcwMDAwMDAwMDAw; Path=/; SameSite=Lax";
    });

    await page.evaluate(
      async ({ e, p }) => {
        await fetch("/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName: "Trace Kilo", email: e, password: p }),
        });
      },
      { e: email, p: password }
    );

    await page.reload({ waitUntil: "networkidle" });
    console.log("=== token before login: " + (await page.evaluate(() => localStorage.getItem("token"))));

    // Poll localStorage token every 100ms for 6s starting just before click
    const poll = setInterval(async () => {
      try {
        const t = await page.evaluate(() => localStorage.getItem("token"));
        console.log("[POLL] " + (t ? "SET(" + t.slice(0, 12) + "...)" : "NULL"));
      } catch (_) {}
    }, 100);

    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    console.log("=== CLICK LOGIN ===");
    await page.click('button[type="submit"]');

    await page.waitForTimeout(6000);
    clearInterval(poll);
    console.log("=== FINAL URL: " + page.url());
    console.log("=== token at end: " + (await page.evaluate(() => localStorage.getItem("token"))));
  } catch (e) {
    console.log("HARNESS ERROR: " + e.message);
  } finally {
    await browser.close();
  }
})();
