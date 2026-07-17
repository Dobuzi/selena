import { test, expect, type Page } from "@playwright/test";

async function enterRoom(
  page: Page,
  opts: {
    mode: "create" | "join";
    school: string;
    hall: string;
    nickname: string;
  },
) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Selena" })).toBeVisible();

  if (opts.mode === "create") {
    await page.getByTestId("home-create").click();
  } else {
    await page.getByTestId("home-join").click();
  }

  await expect(page.getByTestId("input-school")).toBeVisible();
  await page.getByTestId("input-school").fill(opts.school);
  await page.getByTestId("input-hall").fill(opts.hall);
  await page.getByTestId("input-nickname").fill(opts.nickname);
  await page.getByTestId("submit-enter").click();
  await expect(page).toHaveURL(/\/room\//, { timeout: 15_000 });
}

test("two players join same room, multi battle, both answer", async ({
  browser,
}) => {
  const stamp = Date.now();
  const school = `멀티학교${stamp}`;
  const hall = `멀티시험장${stamp}`;

  const hostCtx = await browser.newContext();
  const guestCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();

  try {
    await enterRoom(host, {
      mode: "create",
      school,
      hall,
      nickname: "호스트",
    });

    // Solo label while alone
    await expect(host.getByTestId("start-battle")).toContainText("솔로", {
      timeout: 10_000,
    });

    await enterRoom(guest, {
      mode: "join",
      school,
      hall,
      nickname: "게스트",
    });

    // Both should see 2 participants eventually
    await expect(host.getByText(/참가자 \(2\/4\)/)).toBeVisible({
      timeout: 15_000,
    });
    await expect(guest.getByText(/참가자 \(2\/4\)/)).toBeVisible({
      timeout: 10_000,
    });

    // Host start becomes multi
    await expect(host.getByTestId("start-battle")).toContainText("멀티", {
      timeout: 10_000,
    });
    await host.getByTestId("start-battle").click();

    await expect(host.getByTestId("question-stem")).toBeVisible({
      timeout: 25_000,
    });
    await expect(guest.getByTestId("question-stem")).toBeVisible({
      timeout: 25_000,
    });

    // Same question text for both
    const hostStem = (await host.getByTestId("question-stem").innerText()).trim();
    const guestStem = (await guest.getByTestId("question-stem").innerText()).trim();
    expect(hostStem).toBe(guestStem);

    await host.getByTestId("choice-0").click();
    // Guest should still be answering (not reveal yet if host alone answered)
    await guest.getByTestId("choice-1").click();

    // After both submit → reveal
    await expect(host.getByText("해설").first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(guest.getByText("해설").first()).toBeVisible({
      timeout: 10_000,
    });
  } finally {
    await hostCtx.close();
    await guestCtx.close();
  }
});
