import { test, expect } from '@playwright/test';
import { uniqueEmail, eventCard } from './helpers.js';
import { EVENTS } from './constants.js';

// "Reflects a new purchase without a manual refresh": the app is a SPA with no
// realtime push, so this exercises the full purchase → lookup journey within a
// single session (client-side nav + fetch, never a browser reload).
test('a newly purchased ticket shows up in My Tickets in the same session', async ({ page }) => {
  const email = uniqueEmail('journey');

  await page.goto('/');
  const card = eventCard(page, EVENTS.zoukPublished);
  await card.getByRole('button', { name: 'Get Tickets' }).click();
  await page.getByPlaceholder('Your email address').fill(email);
  await page.getByRole('button', { name: 'Claim Ticket' }).click();
  await expect(page.getByRole('heading', { name: "You're going!" })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  // Client-side navigation — no full page reload.
  await page.getByRole('link', { name: 'My Tickets' }).click();
  await expect(page).toHaveURL(/\/my-tickets$/);

  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByRole('button', { name: 'Find Tickets' }).click();

  await expect(page.getByText(EVENTS.zoukPublished)).toBeVisible();
});
