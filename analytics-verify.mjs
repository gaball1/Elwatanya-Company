import { chromium } from "playwright";

const base = "http://localhost:3000";
const api = "http://localhost:3001/api/v1";

const loginResp = await fetch(`${api}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@elwataniya.com", password: "Admin@123" }),
});
const loginJson = await loginResp.json();
const token = loginJson?.data?.accessToken;

const browser = await chromium.launch();
const page = await browser.newPage();
const results = [];
page.on("pageerror", (e) => results.push(`PAGEERROR: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") results.push(`CONSOLE: ${m.text()}`);
});

await page.goto(base, { waitUntil: "domcontentloaded" });
if (token) {
  await page.evaluate((t) => {
    localStorage.setItem("elwataniya_access_token", t);
    document.cookie = `elwataniya_token=${t};path=/;SameSite=Lax;max-age=604800`;
  }, token);
}

await page.goto(`${base}/ar/analytics`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(6000);

const kpiText = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll("script")).length;
  const bodyText = document.body.innerText;
  return {
    hasProjectDash: /تحليلات المشروع|Project Analytics/.test(bodyText),
    projectSelectOptions: Array.from(document.querySelectorAll("select")).map((s) => Array.from(s.options).map((o) => o.textContent.trim())),
    bodySnippet: bodyText.slice(0, 600),
  };
});
results.push("analytics page: " + JSON.stringify(kpiText, null, 1));

// select first project and wait for KPI load
await page.selectOption("select >> nth=0", { index: 1 }).catch(() => {});
await page.waitForTimeout(5000);
const kpiNumbers = await page.evaluate(() => {
  const lines = document.body.innerText.split("\n").map((l) => l.trim()).filter(Boolean);
  const start = lines.findIndex((l) => l.includes("القيمة المكتسبة") || l.includes("Earned value"));
  return lines.slice(start, start + 40);
});
results.push("after project selection: " + kpiNumbers.join(" | "));

await browser.close();
console.log(results.join("\n---\n"));