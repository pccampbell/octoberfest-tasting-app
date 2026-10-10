import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { BeerOrigin, BeerResult } from './types';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const formatOrigin = ({ country, state }: BeerOrigin) =>
  country === 'US' && state?.trim() ? `US - ${state.trim()}` : country;

export function originAverage(beers: BeerResult[]) {
  const rated = beers.filter((beer) => beer.rating_count > 0 && beer.average_score !== null);
  return rated.length
    ? rated.reduce((total, beer) => total + beer.average_score!, 0) / rated.length
    : null;
}

export const sortResults = (beers: BeerResult[]) =>
  [...beers].sort(
    (a, b) =>
      (b.rating_count ? (b.average_score ?? 0) : -1) -
        (a.rating_count ? (a.average_score ?? 0) : -1) ||
      b.rating_count - a.rating_count ||
      a.name.localeCompare(b.name, 'en') ||
      a.id.localeCompare(b.id),
  );

export function joinUrl(configured: string, origin: string) {
  const url = new URL(configured || origin);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    /(^|\.)localhost$|^(127\..*|\[::1\]|0\.0\.0\.0)$/i.test(url.hostname)
  )
    return null;
  return new URL('/join', url.origin).href;
}
