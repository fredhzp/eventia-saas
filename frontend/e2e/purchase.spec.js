import { test, expect } from '@playwright/test';
import { uniqueEmail, eventCard, findPublicEvent } from './helpers.js';
import { EVENTS, BACKEND_URL } from './constants.js';

test.describe('Ticket purchase', () => {
  test('buyer purchases a ticket and sees confirmation with a QR code', async ({ page }) => {
    await page.goto('/');
    const card = eventCard(page, EVENTS.zoukPublished);
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Get Tickets' }).click();

    await page.getByPlaceholder('Your email address').fill(uniqueEmail('buyer'));
    await page.getByRole('button', { name: 'Claim Ticket' }).click();

    await expect(page.getByRole('heading', { name: "You're going!" })).toBeVisible();
    await expect(page.locator('#ticket-qr')).toBeVisible(); // rendered QR canvas
  });

  // Money path: at capacity the UI blocks the buy and the API refuses to
  // over-sell — no ticket is created.
  test('purchasing a sold-out event is cleanly rejected (UI + API)', async ({ page, request }) => {
    await page.goto('/');
    const card = eventCard(page, EVENTS.soldOut);
    await expect(card).toBeVisible();
    // UI: the buy button is disabled and labelled "Sold Out".
    await expect(card.getByRole('button', { name: 'Sold Out' })).toBeDisabled();

    // API: a direct purchase attempt is rejected with SOLD_OUT and creates nothing.
    const before = await findPublicEvent(request, EVENTS.soldOut);
    const res = await request.post(`${BACKEND_URL}/api/tickets/purchase`, {
      data: { eventId: before.id, tenantId: before.tenantId, customerEmail: uniqueEmail('nope') },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('SOLD_OUT');

    const after = await findPublicEvent(request, EVENTS.soldOut);
    expect(after._count.tickets).toBe(before._count.tickets); // unchanged → no ticket created
  });
});
