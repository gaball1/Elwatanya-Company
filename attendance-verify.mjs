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
const context = await browser.newContext({
  permissions: ["geolocation", "camera"],
  geolocation: { latitude: 30.0652, longitude: 32.6498, accuracy: 10 },
});
const page = await context.newPage();
const results = [];
page.on("pageerror", (e) => results.push(`PAGEERROR: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") results.push(`CONSOLE: ${m.text()}`); });

await page.goto(base, { waitUntil: "domcontentloaded" });
if (token) {
  await page.evaluate((t) => {
    localStorage.setItem("elwataniya_access_token", t);
    document.cookie = `elwataniya_token=${t};path=/;SameSite=Lax;max-age=604800`;
  }, token);
}
await page.goto(`${base}/ar/attendance`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(6000);

const pageInfo = await page.evaluate(() => ({
  hasCheckInSection: /تسجيل الحضور|حضور|سجل حضور/.test(document.body.innerText),
  hasLocationBtn: Array.from(document.querySelectorAll("button")).some((b) => /تحديد الموقع|الموقع/.test(b.textContent || "")),
  bodySnippet: document.body.innerText.slice(0, 800),
}));
results.push("attendance page: " + JSON.stringify(pageInfo));

// click the "detect location" button
await page.getByRole("button", { name: /تحديد موقعي|Identify location|تحديد الموقع/ }).click().catch(async () => {
  const btns = await page.evaluate(() => Array.from(document.querySelectorAll("button")).map((b) => b.textContent?.trim()));
  results.push("buttons: " + JSON.stringify(btns.filter(Boolean).slice(0, 25)));
});
await page.waitForTimeout(4000);
const after = await page.evaluate(() => ({
  hasCoords: /30\.|3[01]\.\d/.test(document.body.innerText),
  snippet: document.body.innerText.slice(0, 1500),
}));
results.push("after location click: " + JSON.stringify(after));

await browser.close();
console.log(results.join("\n"));