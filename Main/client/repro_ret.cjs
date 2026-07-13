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

  const email = "ret.kilo." + Date.now() + "@example.com";
  const password = "password123";

  try {
    // Seed a STALE (invalid) token + cookie, like a browser from the mock era
    await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.setItem("token", "c2FyYWhAZXhhbXBsZS5jb206MTcwMDAwMDAwMDAw");
      document.cookie = "trustnet_refresh=c2FyYWhAZXhhbXBsZS5jb206MTcwMDAwMDAwMDAw; Path=/; SameSite=Lax";
    });

    // Register a real account (so login can succeed)
    await page.evaluate(
      async ({ e, p }) => {
        await fetch("/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName: "Ret Kilo", email: e, password: p }),
        });
      },
      { e: email, p: password }
    );

    // Reload with stale token present (simulates returning user)
    await page.reload({ waitUntil: "networkidle" });
    const before = await page.evaluate(() => localStorage.getItem("token"));
    console.log("=== LOCALSTORAGE BEFORE LOGIN: " + before);

    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(300);
    const immediate = await page.evaluate(() => localStorage.getItem("token"));
    console.log("=== LOCALSTORAGE IMMEDIATELY AFTER LOGIN: " + immediate);

    await page.waitForTimeout(3000);
    const later = await page.evaluate(() => localStorage.getItem("token"));
    console.log("=== LOCALSTORAGE 3s LATER: " + later);
    console.log("=== FINAL URL: " + page.url());
  } catch (e) {
    console.log("HARNESS ERROR: " + e.message);
  } finally {
    await browser.close();
  }
})();
