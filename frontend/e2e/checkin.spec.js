import { test, expect } from '@playwright/test';
import { uniqueEmail, findPublicEvent, apiPurchase } from './helpers.js';
import { EVENTS } from './constants.js';

test.describe('Check-in (fraud prevention)', () => {
  test('a legitimate ticket is accepted at check-in', async ({ page, request }) => {
    const ev = await findPublicEvent(request, EVENTS.zoukPublished);
    const ticket = await apiPurchase(request, { eventId: ev.id, tenantId: ev.tenantId, email: uniqueEmail('chk') });

    await page.goto('/checkin');
    await page.locator('input[name="qrCode"]').fill(ticket.qrCode);
    await page.getByRole('button', { name: 'Check In' }).click();

    await expect(page.getByText('Checked in')).toBeVisible();
    await expect(page.getByText(EVENTS.zoukPublished)).toBeVisible();
  });

  // The core anti-fraud guarantee: a QR is single-use.
  test('the same ticket cannot be checked in twice', async ({ page, request }) => {
    const ev = await findPublicEvent(request, EVENTS.zoukPublished);
    const ticket = await apiPurchase(request, { eventId: ev.id, tenantId: ev.tenantId, email: uniqueEmail('chk2') });

    await page.goto('/checkin');
    const input = page.locator('input[name="qrCode"]');

    await input.fill(ticket.qrCode);
    await page.getByRole('button', { name: 'Check In' }).click();
    await expect(page.getByText('Checked in')).toBeVisible();

    // Second scan of the same code is rejected.
    await input.fill(ticket.qrCode);
    await page.getByRole('button', { name: 'Check In' }).click();
    await expect(page.getByText('Already checked in')).toBeVisible();
  });
});
