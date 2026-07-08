import { test, expect } from '@playwright/test';
import { loginAsOrganizer, apiLogin, apiCreateDraftEvent } from './helpers.js';
import { ORG_ZOUK } from './constants.js';

test.describe('Event management', () => {
  test('organizer creates an event and it appears in their dashboard list', async ({ page }) => {
    await loginAsOrganizer(page, ORG_ZOUK.email, ORG_ZOUK.password);

    await page.goto('/dashboard/create-event');
    const title = `E2E New Event ${Date.now()}`;
    await page.getByPlaceholder('e.g. Summer Jazz Night').fill(title);
    await page.locator('input[type="datetime-local"]').fill('2027-06-15T20:00');
    await page.locator('select').selectOption({ index: 1 }); // first real venue
    await page.getByRole('button', { name: 'Create Event' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    const row = page.getByRole('row', { name: title });
    await expect(row).toBeVisible();
    await expect(row.getByText('DRAFT', { exact: true })).toBeVisible(); // new events start as DRAFT
  });

  // The app has no free-text edit; status is the editable field. Publishing a
  // draft is the "edit", and it must survive a reload (persisted, not local state).
  test('publishing a draft event persists after a reload', async ({ page, request }) => {
    const { token, tenantId } = await apiLogin(request, ORG_ZOUK.email, ORG_ZOUK.password);
    // Title deliberately avoids the words "draft"/"published" so status-badge
    // assertions can't accidentally match the title cell.
    const title = `E2E Lifecycle ${Date.now()}`;
    await apiCreateDraftEvent(request, { token, tenantId, title });

    await loginAsOrganizer(page, ORG_ZOUK.email, ORG_ZOUK.password);

    const row = page.getByRole('row', { name: title });
    await expect(row.getByText('DRAFT', { exact: true })).toBeVisible();
    await row.getByRole('button', { name: 'Publish' }).click();
    await expect(row.getByText('PUBLISHED', { exact: true })).toBeVisible();

    await page.reload();
    const rowAfter = page.getByRole('row', { name: title });
    await expect(rowAfter.getByText('PUBLISHED', { exact: true })).toBeVisible();
  });
});
