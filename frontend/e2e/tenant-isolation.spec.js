import { test, expect } from '@playwright/test';
import { apiLogin, findPublicEvent, readExpiredToken } from './helpers.js';
import { ORG_ZOUK, EVENTS, BACKEND_URL } from './constants.js';

// The suite's headline security story: one tenant can never touch another's data.
test.describe('Multi-tenant isolation', () => {
  test('an organizer sees only their own tenant\'s events on the dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(ORG_ZOUK.email);
    await page.getByPlaceholder('Password').fill(ORG_ZOUK.password);
    await page.getByPlaceholder('Password').press('Enter');
    await expect(page).toHaveURL(/\/dashboard$/);

    await expect(page.getByText(EVENTS.zoukPublished)).toBeVisible();      // own event
    await expect(page.getByText(EVENTS.esplanadePublished)).toHaveCount(0); // other tenant's — hidden
  });

  test('an organizer cannot modify another tenant\'s event (403)', async ({ request }) => {
    const zouk = await apiLogin(request, ORG_ZOUK.email, ORG_ZOUK.password);
    const victim = await findPublicEvent(request, EVENTS.esplanadePublished); // Esplanade's event

    const res = await request.patch(`${BACKEND_URL}/api/events/${victim.id}/status`, {
      headers: { Authorization: `Bearer ${zouk.token}` },
      data: { status: 'CANCELLED' },
    });
    expect(res.status()).toBe(403);

    // And the victim event is untouched.
    const still = await findPublicEvent(request, EVENTS.esplanadePublished);
    expect(still.status).toBe('PUBLISHED');
  });

  test('an expired token is rejected by protected endpoints (401)', async ({ request }) => {
    const expired = readExpiredToken();
    const res = await request.post(`${BACKEND_URL}/api/events`, {
      headers: { Authorization: `Bearer ${expired}` },
      data: { title: 'should not be created', date: '2027-01-01T10:00', venueId: 'x', tenantId: 'y' },
    });
    expect(res.status()).toBe(401);
  });
});
