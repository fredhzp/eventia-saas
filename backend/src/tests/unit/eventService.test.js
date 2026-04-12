/**
 * WHITE-BOX unit tests for eventService.js
 * Prisma and eventRepository are mocked — no DB access.
 */

jest.mock('../../lib/prisma', () => ({
  event: { findUnique: jest.fn() },
}));
jest.mock('../../repositories/eventRepository');

const eventRepo    = require('../../repositories/eventRepository');
const prisma       = require('../../lib/prisma');
const eventService = require('../../services/eventService');

beforeEach(() => jest.clearAllMocks());

const validDto = {
  title:    'Test Concert',
  date:     '2027-06-15T19:00:00Z',
  venueId:  'venue-1',
  tenantId: 'tenant-1',
};

// ── publishEvent ──────────────────────────────────────────────────────────────

describe('WB-08 | publishEvent — creates event with DRAFT status', () => {
  it('calls eventRepository.save with status DRAFT and returns the event', async () => {
    const mockEvent = { id: 'evt-1', title: 'Test Concert', status: 'DRAFT' };
    eventRepo.save.mockResolvedValue(mockEvent);

    const result = await eventService.publishEvent(validDto);

    expect(eventRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Test Concert', status: 'DRAFT' })
    );
    expect(result).toEqual(mockEvent);
  });
});

describe('WB-09 | publishEvent — throws INVALID_DATE for unparseable string', () => {
  it('rejects with INVALID_DATE when date is "not-a-date"', async () => {
    await expect(eventService.publishEvent({ ...validDto, date: 'not-a-date' }))
      .rejects.toThrow('INVALID_DATE');
  });
});

describe('WB-10 | publishEvent — throws INVALID_DATE for empty date string', () => {
  it('rejects with INVALID_DATE when date is empty string', async () => {
    await expect(eventService.publishEvent({ ...validDto, date: '' }))
      .rejects.toThrow('INVALID_DATE');
  });
});

// ── checkAvailability ─────────────────────────────────────────────────────────

describe('WB-11 | checkAvailability — available=true when tickets < capacity', () => {
  it('returns available:true and correct remaining count', async () => {
    prisma.event.findUnique.mockResolvedValue({
      id: 'evt-1',
      venue:  { capacity: 100 },
      _count: { tickets: 40 },
    });

    const result = await eventService.checkAvailability('evt-1');

    expect(result.available).toBe(true);
    expect(result.remaining).toBe(60);
  });
});

describe('WB-12 | checkAvailability — available=false when sold >= capacity (boundary)', () => {
  it('returns available:false and remaining:0 when exactly at capacity', async () => {
    prisma.event.findUnique.mockResolvedValue({
      id: 'evt-1',
      venue:  { capacity: 100 },
      _count: { tickets: 100 },
    });

    const result = await eventService.checkAvailability('evt-1');

    expect(result.available).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
