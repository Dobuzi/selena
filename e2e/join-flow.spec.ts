import { test, expect } from "@playwright/test";

test("create then join from second context enters same multi lobby", async ({
  browser,
}) => {
  const stamp = Date.now();
  const school = `입장학교${stamp}`;
  const hall = `입장시험장${stamp}`;

  const hostCtx = await browser.newContext();
  const guestCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();

  try {
    await host.goto("/");
    await host.getByTestId("home-create").click();
    await host.getByTestId("input-school").fill(school);
    await host.getByTestId("input-hall").fill(hall);
    await host.getByTestId("input-nickname").fill("호스트");
    await host.getByTestId("submit-enter").click();
    await expect(host).toHaveURL(/\/room\/?\?id=/, { timeout: 15_000 });
    await expect(host.getByTestId("start-battle")).toBeVisible({
      timeout: 10_000,
    });
    await expect(host.getByText(/참가자 \(1\/4\)/)).toBeVisible();

    await guest.goto("/");
    await guest.getByTestId("home-join").click();
    await guest.getByTestId("input-school").fill(school);
    await guest.getByTestId("input-hall").fill(hall);
    await guest.getByTestId("input-nickname").fill("게스트");
    await guest.getByTestId("submit-enter").click();
    await expect(guest).toHaveURL(/\/room\/?\?id=/, { timeout: 15_000 });

    await expect(host.getByText(/참가자 \(2\/4\)/)).toBeVisible({
      timeout: 15_000,
    });
    await expect(guest.getByText(/참가자 \(2\/4\)/)).toBeVisible({
      timeout: 10_000,
    });
    await expect(host.getByTestId("start-battle")).toContainText("멀티");
  } finally {
    await hostCtx.close();
    await guestCtx.close();
  }
});

test("after create, lobby remains reachable (entry regression)", async ({
  page,
}) => {
  const stamp = Date.now();
  await page.goto("/");
  await page.getByTestId("home-create").click();
  await page.getByTestId("input-school").fill(`회귀학교${stamp}`);
  await page.getByTestId("input-hall").fill(`회귀시험장${stamp}`);
  await page.getByTestId("input-nickname").fill("테스터");
  await page.getByTestId("submit-enter").click();

  await expect(page).toHaveURL(/\/room\/?\?id=/, { timeout: 15_000 });
  // Must not bounce home or stick on loading
  await expect(page.getByText("시험장 들어가는 중")).toHaveCount(0, {
    timeout: 10_000,
  });
  await expect(page.getByRole("heading", { name: "Selena" })).toHaveCount(0);
  await expect(page.getByTestId("start-battle")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("시험장", { exact: true })).toBeVisible();
});

test("loading spinner clears even if room is missing", async ({ page }) => {
  await page.goto("/room/?id=missing-room-id-zzz");
  await expect(page.getByText("시험장 들어가는 중")).toHaveCount(0, {
    timeout: 10_000,
  });
  // Error or empty-state UI with way home — not infinite spinner
  await expect(
    page.getByRole("button", { name: "홈으로" }).or(page.getByText(/찾을 수 없어요|정보가 없어요/)),
  ).toBeVisible({ timeout: 10_000 });
});
