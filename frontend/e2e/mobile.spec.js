import { test, expect, devices } from '@playwright/test';
import { uniqueEmail, eventCard } from './helpers.js';
import { EVENTS } from './constants.js';

// Smoke test the money path on a real mobile viewport.
test.use({ ...devices['iPhone 14'] });

test('buyer can purchase a ticket on an iPhone 14 viewport', async ({ page }) => {
  await page.goto('/');
  const card = eventCard(page, EVENTS.zoukPublished);
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Get Tickets' }).click();

  await page.getByPlaceholder('Your email address').fill(uniqueEmail('mobile'));
  await page.getByRole('button', { name: 'Claim Ticket' }).click();

  await expect(page.getByRole('heading', { name: "You're going!" })).toBeVisible();
  await expect(page.locator('#ticket-qr')).toBeVisible();
});
