import { test, expect } from '@playwright/test';
import { uniqueEmail } from './helpers.js';
import { ORG_ZOUK } from './constants.js';

test.describe('Authentication', () => {
  // Critical path: an organizer must be able to create an account and get back in.
  test('organizer can sign up, log out, and log back in to the dashboard', async ({ page }) => {
    const email = uniqueEmail('newco');
    const password = 'Password1!';

    await page.goto('/login');
    await page.getByRole('button', { name: 'Register' }).first().click(); // Register tab
    await page.getByPlaceholder('Email address').fill(email);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('No events yet.')).toBeVisible(); // fresh tenant, no events

    // Log out → the protected route bounces back to login.
    await page.getByRole('button', { name: 'Logout' }).first().click();
    await expect(page).toHaveURL(/\/login$/);

    // Log back in with the same credentials.
    await page.getByPlaceholder('Email address').fill(email);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByPlaceholder('Password').press('Enter');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  // Money/security path: bad credentials must fail closed.
  test('login with a wrong password shows an error and does not redirect', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(ORG_ZOUK.email);
    await page.getByPlaceholder('Password').fill('definitely-wrong-password');
    await page.getByPlaceholder('Password').press('Enter');

    await expect(page.getByText('Invalid email or password.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  // A tampered/invalid session token must not render any protected data.
  test('an invalid session token redirects to login with no dashboard data flash', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('token', 'not-a-real-jwt'));

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login$/);
    // "Total Tickets Sold" only exists on the dashboard — it must never appear.
    await expect(page.getByText('Total Tickets Sold')).toHaveCount(0);
  });
});
