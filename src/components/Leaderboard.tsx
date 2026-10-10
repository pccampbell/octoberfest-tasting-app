import type { ReactNode } from 'react';
import { Beer } from 'lucide-react';
import type { BeerResult } from '../lib/types';
import { formatOrigin } from '../lib/utils';

export function Leaderboard({
  beers,
  title = 'The leaderboard',
  label = 'Beer leaderboard',
  rowPrefix = 'result',
  children,
}: {
  beers: BeerResult[];
  title?: string;
  label?: string;
  rowPrefix?: string;
  children?: ReactNode;
}) {
  return (
    <section className="leaderboard" aria-label={label}>
      <div className="leaderboard-title">
        <h2>{title}</h2>
        <span>AVERAGE / 10</span>
      </div>
      {children}
      {!beers.length && (
        <div className="empty-state">
          <Beer size={32} />
          <h3>{children ? 'No beers in this origin yet.' : 'The lineup is on its way.'}</h3>
          <p>
            {children
              ? 'Try another country or state.'
              : 'The host can add beers to get the tasting started.'}
          </p>
        </div>
      )}
      {beers.map((beer, i) => (
        <article
          className={`leaderboard-row ${i === 0 && beer.rating_count ? 'first-place' : ''}`}
          key={beer.id}
          data-testid={`${rowPrefix}-${beer.name}`}
        >
          <span className="rank-number">
            {beer.rating_count ? String(i + 1).padStart(2, '0') : '—'}
          </span>
          <div className="rank-details">
            <h3>{beer.name}</h3>
            <p>{[beer.brewery, formatOrigin(beer)].filter(Boolean).join(' · ')}</p>
            <div className="score-bar">
              <span
                style={{ width: `${beer.rating_count ? (beer.average_score ?? 0) * 10 : 0}%` }}
              />
            </div>
          </div>
          <div className="rank-score">
            <strong>{beer.rating_count ? Number(beer.average_score).toFixed(1) : '—'}</strong>
            <span>
              {beer.rating_count
                ? `${beer.rating_count} ${beer.rating_count === 1 ? 'rating' : 'ratings'}`
                : 'Not yet rated'}
            </span>
          </div>
        </article>
      ))}
      <p className="leaderboard-footnote">Averages settle as more tasters join in.</p>
    </section>
  );
}
