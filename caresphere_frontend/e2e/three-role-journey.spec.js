import { expect, test } from "@playwright/test";

const password = process.env.E2E_DEMO_PASSWORD || "CareSphereE2E!2026";

async function signIn(page, email) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in to CareSphere" }).click();
}

test("client reaches only the family workspace and sees the demo request", async ({
  page,
}) => {
  await signIn(page, "family.demo@caresphere.local");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Welcome back, Freddie." })
  ).toBeVisible();

  await page.goto("/bookings");
  await expect(
    page.getByRole("heading", { name: "Your care requests and bookings." })
  ).toBeVisible();
  await expect(page.getByText("Mary Family-Demo")).toBeVisible();

  await page.goto("/provider-dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("care company reaches only its provider workspace and booking data", async ({
  page,
}) => {
  await signIn(page, "provider.demo@caresphere.local");

  await expect(page).toHaveURL(/\/provider-dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Welcome back, Priya Provider" })
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Care company workspace" })).toBeVisible();
  await expect(page.getByText("Mary Family-Demo")).toBeVisible();

  await page.goto("/admin-dashboard");
  await expect(
    page.getByText(
      "This workspace is restricted to CareSphere platform administrators."
    )
  ).toBeVisible();
});

test("administrator reaches platform operations and cannot enter provider UI", async ({
  page,
}) => {
  await signIn(page, "admin.demo@caresphere.local");

  await expect(page).toHaveURL(/\/admin-dashboard$/);
  await expect(
    page.getByRole("heading", { name: "CareSphere Administration" })
  ).toBeVisible();

  await page.goto("/admin-dashboard/bookings");
  await expect(page.getByText("Mary Family-Demo")).toBeVisible();
  await expect(page.getByText("Demo Home Care Watford")).toBeVisible();

  await page.goto("/provider-dashboard");
  await expect(page).toHaveURL(/\/admin-dashboard$/);
});
