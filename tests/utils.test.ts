import { describe, expect, it } from 'vitest';
import { joinUrl, sortResults } from '../src/lib/utils';
import type { BeerResult } from '../src/lib/types';

const result = (id: string, name: string, average_score: number | null, rating_count: number) =>
  ({ id, name, average_score, rating_count }) as BeerResult;
describe('leaderboard order', () => {
  it('sorts by average, rating count, name, then stable ID and keeps unrated beers last', () => {
    const beers = [
      result('d', 'Unrated', null, 0),
      result('c', 'Zebra', 8, 2),
      result('b', 'Amber', 8, 2),
      result('a', 'Gold', 8, 3),
      result('e', 'Winner', 10, 1),
    ];
    expect(sortResults(beers).map((b) => b.id)).toEqual(['e', 'a', 'b', 'c', 'd']);
    expect(beers[0].id).toBe('d');
  });
});
describe('QR destination', () => {
  it('always points to join on the configured public origin', () => {
    expect(joinUrl('https://beer.example.com/qr', 'http://localhost:5173')).toBe(
      'https://beer.example.com/join',
    );
    expect(joinUrl('', 'http://192.168.1.50:8090')).toBe('http://192.168.1.50:8090/join');
  });
  it.each([
    'http://localhost:8090',
    'http://tasting.localhost:8090',
    'http://127.0.0.1:5173',
    'http://[::1]:8090',
    'http://0.0.0.0',
    'javascript:alert(1)',
    'https://user:pass@example.com',
  ])('rejects unsafe or loopback destination %s', (url) => {
    expect(joinUrl(url, 'http://localhost:5173')).toBeNull();
  });
});
