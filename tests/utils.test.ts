import { describe, expect, it } from 'vitest';
import { formatOrigin, joinUrl, originAverage, sortResults } from '../src/lib/utils';
import type { BeerResult } from '../src/lib/types';

const result = (id: string, name: string, average_score: number | null, rating_count: number) =>
  ({ id, name, average_score, rating_count }) as BeerResult;
describe('origin comparisons', () => {
  it('gives each rated beer equal weight despite unequal rating counts', () => {
    expect(originAverage([result('a', 'Popular', 10, 3), result('b', 'New pour', 2, 1)])).toBe(6);
  });
  it('excludes unrated beers and keeps full precision until display', () => {
    expect(originAverage([result('a', 'Rated', 7.12345, 3), result('b', 'Unrated', 0, 0)])).toBe(
      7.12345,
    );
  });
  it('shows no average for an empty or entirely unrated origin', () => {
    expect(originAverage([])).toBeNull();
    expect(originAverage([result('a', 'Unrated', null, 0)])).toBeNull();
  });
  it('shows a state only for US beers and accepts missing origins', () => {
    expect(formatOrigin({ country: 'US', state: ' Wisconsin ' })).toBe('US - Wisconsin');
    expect(formatOrigin({ country: 'US', state: '' })).toBe('US');
    expect(formatOrigin({ country: 'Germany', state: '' })).toBe('Germany');
    expect(formatOrigin({ country: 'Germany', state: 'Bavaria' })).toBe('Germany');
    expect(formatOrigin({ country: '', state: '' })).toBe('');
  });
});
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
