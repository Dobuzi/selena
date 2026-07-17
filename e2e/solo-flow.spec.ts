import { test, expect } from "@playwright/test";

test("create room, start solo, answer one question", async ({ page }) => {
  const stamp = Date.now();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Selena" })).toBeVisible();

  await page.getByTestId("home-create").click();
  await expect(page.getByTestId("input-school")).toBeVisible();
  await page.getByTestId("input-school").fill(`E2E학교${stamp}`);
  await page.getByTestId("input-hall").fill(`E2E시험장${stamp}`);
  await page.getByTestId("input-nickname").fill("테스터");
  await page.getByTestId("submit-enter").click();

  await expect(page).toHaveURL(/\/room\?id=/, { timeout: 15_000 });
  await expect(page.getByTestId("start-battle")).toBeVisible({ timeout: 10_000 });

  await page.getByTestId("start-battle").click();
  await expect(page.getByTestId("question-stem")).toBeVisible({ timeout: 25_000 });

  await page.getByTestId("choice-0").click();
  await expect(page.getByText("해설").first()).toBeVisible({ timeout: 10_000 });
});
