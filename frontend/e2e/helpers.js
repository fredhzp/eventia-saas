import { expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { BACKEND_URL, EXPIRED_TOKEN_PATH } from './constants.js';

/** Unique value so create/purchase tests are re-runnable without collisions. */
export function uniqueEmail(prefix = 'user') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@e2e.test`;
}

// ── API helpers (real HTTP to the e2e backend) ──────────────────────────────

export async function apiLogin(request, email, password) {
  const res = await request.post(`${BACKEND_URL}/api/auth/login`, { data: { email, password } });
  expect(res.ok(), `login failed for ${email}`).toBeTruthy();
  return res.json(); // { token, role, tenantId }
}

export async function apiPublicEvents(request) {
  const res = await request.get(`${BACKEND_URL}/api/events/public`);
  expect(res.ok()).toBeTruthy();
  return res.json();
}

export async function findPublicEvent(request, title) {
  const events = await apiPublicEvents(request);
  const ev = events.find((e) => e.title === title);
  expect(ev, `public event not found: ${title}`).toBeTruthy();
  return ev;
}

export async function apiVenues(request) {
  const res = await request.get(`${BACKEND_URL}/api/venues`);
  expect(res.ok()).toBeTruthy();
  return res.json();
}

export async function apiCreateDraftEvent(request, { token, tenantId, title }) {
  const venues = await apiVenues(request);
  const res = await request.post(`${BACKEND_URL}/api/events`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { title, date: '2027-06-15T20:00', venueId: venues[0].id, tenantId },
  });
  expect(res.status(), 'create event').toBe(201);
  return (await res.json()).event;
}

export async function apiPurchase(request, { eventId, tenantId, email }) {
  const res = await request.post(`${BACKEND_URL}/api/tickets/purchase`, {
    data: { eventId, tenantId, customerEmail: email },
  });
  expect(res.status(), 'purchase ticket').toBe(201);
  return (await res.json()).ticket; // { qrCode, ... }
}

export function readExpiredToken() {
  return readFileSync(EXPIRED_TOKEN_PATH, 'utf8').trim();
}

// ── UI helpers ──────────────────────────────────────────────────────────────

/** Log in through the real login form and wait for the organizer dashboard. */
export async function loginAsOrganizer(page, email, password) {
  await page.goto('/login');
  await page.getByPlaceholder('Email address').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByPlaceholder('Password').press('Enter');
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** The event card on the public Home grid for a given title. */
export function eventCard(page, title) {
  return page.locator('.grid > div', { hasText: title });
}
