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

// list notifications via API
const listResp = await fetch(`${api}/notifications`, { headers: { Authorization: `Bearer ${token}` } });
const listJson = await listResp.json();
const notifData = listJson?.data ?? listJson;
console.log("notifications API status:", listResp.status, "count:", (notifData?.length ?? notifData?.notifications?.length ?? 0));

// try creating one to test delete
const createResp = await fetch(`${api}/notifications`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ title: "test-delete", message: "probe", type: "info" }),
});
console.log("create status:", createResp.status, await createResp.text().catch(() => ""));

const browser = await chromium.launch();
const page = await browser.newPage();
const results = [];
page.on("pageerror", (e) => results.push(`PAGEERROR: ${e.message}`));
await page.goto(base, { waitUntil: "domcontentloaded" });
await page.evaluate((t) => {
  localStorage.setItem("elwataniya_access_token", t);
  document.cookie = `elwataniya_token=${t};path=/;SameSite=Lax;max-age=604800`;
}, token);
await page.goto(`${base}/ar/notifications`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(5000);
const info = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll("button")).map((b) => (b.textContent || "").trim()).filter(Boolean);
  return { title: document.title, hasNotifHeader: /الإشعارات/.test(document.body.innerText), buttons: btns.slice(0, 15) };
});
results.push("page: " + JSON.stringify(info));
await browser.close();
console.log(results.join("\n"));