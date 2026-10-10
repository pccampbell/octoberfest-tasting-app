import { useState } from 'react';
import type { BeerResult, Country } from '../lib/types';
import { originAverage } from '../lib/utils';
import { Leaderboard } from './Leaderboard';

export function OriginLeaderboard({
  beers,
  initialCountry,
  side,
}: {
  beers: BeerResult[];
  initialCountry: Country;
  side: 'left' | 'right';
}) {
  const [country, setCountry] = useState(initialCountry);
  const [state, setState] = useState('');
  const states = [
    ...new Set(
      beers
        .filter((b) => b.country === 'US')
        .map((b) => b.state.trim())
        .filter(Boolean),
    ),
  ].sort();
  const selectedState = country === 'US' && states.includes(state) ? state : '';
  const matching = beers.filter(
    (b) => b.country === country && (!selectedState || b.state.trim() === selectedState),
  );
  const rated = matching.filter((b) => b.rating_count > 0);
  const ratings = rated.reduce((total, beer) => total + beer.rating_count, 0);
  const average = originAverage(matching);
  const title = selectedState ? `US - ${selectedState}` : country;
  return (
    <div className="origin-panel" data-testid={`origin-${side}`}>
      <Leaderboard
        beers={matching}
        title={title}
        label={`${side} origin leaderboard`}
        rowPrefix={`origin-${side}`}
      >
        <div className="origin-controls">
          <label>
            Country
            <select
              aria-label={`Country for ${side} leaderboard`}
              value={country}
              onChange={(e) => {
                setCountry(e.target.value as Country);
                setState('');
              }}
            >
              <option value="US">US</option>
              <option value="Germany">Germany</option>
            </select>
          </label>
          {country === 'US' && (
            <label>
              State
              <select
                aria-label={`State for ${side} leaderboard`}
                value={selectedState}
                onChange={(e) => setState(e.target.value)}
              >
                <option value="">All states</option>
                {states.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="origin-summary">
          <p className="eyebrow">ORIGIN AVERAGE</p>
          <p className="origin-average">
            <strong>{average === null ? '—' : average.toFixed(1)}</strong>
            <span>/ 10</span>
          </p>
          <p>
            {rated.length} of {matching.length} beers rated · {ratings}{' '}
            {ratings === 1 ? 'rating' : 'ratings'}
          </p>
        </div>
      </Leaderboard>
    </div>
  );
}
