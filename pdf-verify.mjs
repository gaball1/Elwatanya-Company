import { chromium } from "playwright";

const base = "http://localhost:3000";
const api = "http://localhost:3001/api/v1";

const loginResp = await fetch(`${api}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@elwataniya.com", password: "Admin@123" }),
});
const loginJson = await loginResp.json();
const token = loginJson?.accessToken || loginJson?.data?.accessToken || loginJson?.token;
console.log("api login status:", loginResp.status, "token:", token ? token.slice(0, 16) : "NO");

const browser = await chromium.launch();
const page = await browser.newPage();
const results = [];

page.on("response", async (res) => {
  if (res.url().includes("/pdf/render")) {
    results.push(`${res.status()} ${res.url()}`);
  }
});
page.on("pageerror", (e) => results.push(`PAGEERROR: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") results.push(`CONSOLE: ${m.text()}`);
});

if (token) {
  await page.goto(`${base}/ar/logout`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.evaluate((t) => {
    localStorage.setItem("elwataniya_access_token", t);
    document.cookie = `elwataniya_token=${t};path=/;SameSite=Lax;max-age=604800`;
  }, token);
}

await page.goto(`${base}/ar/admin/attendance/history`, { waitUntil: "domcontentloaded" }).catch(async () => {
  await page.goto(`${base}/ar/attendance/history`, { waitUntil: "domcontentloaded" }).catch(() => {});
});
await page.waitForTimeout(3000);

const downloadLinks = await page.evaluate(() => {
  return Array.from(document.querySelectorAll("button, a")).filter((el) => /pdf|print|download|تصدير|طباعة|تحميل/i.test(el.textContent || "")).map((el) => el.textContent.trim());
});
results.push("download-ish buttons: " + JSON.stringify(downloadLinks.slice(0, 12)));

results.push("token present: " + (token ? token.slice(0, 20) : "NO"));

if (token) {
  const resp = await page.evaluate(async ({ t, apiBase }) => {
    const r = await fetch(`${apiBase}/pdf/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({
        title: "تقرير تجريبي",
        arabicTitle: "بيان اختبار عربي",
        documentNumber: "ARB-DOC",
        generatedBy: "Admin",
        sections: [{ title: "ملخص", content: "<p>محتوى عربي للتحقق</p>" }],
        locale: "ar",
      }),
    });
    const blob = await r.blob();
    const arr = new Uint8Array(await blob.arrayBuffer());
    let magic = "";
    for (let i = 0; i < Math.min(4, arr.length); i++) magic += String.fromCharCode(arr[i]);
    return { status: r.status, magic };
  }, { t: token, apiBase: api });
  results.push("in-page auth fetch: " + JSON.stringify(resp));
}

console.log(results.join("\n"));
await browser.close();