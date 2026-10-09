import { useEffect, useRef, useState } from 'react';
import { Beer, Crown, Maximize, Trophy, Users, Vote } from 'lucide-react';
import { pb, friendlyError } from '../lib/pocketbase';
import type { BeerResult, PartyStats } from '../lib/types';
import { sortResults } from '../lib/utils';
import { Button } from '../components/ui/button';
import { ErrorMessage, Loading } from '../components/Status';

type Snapshot = { beers: BeerResult[]; stats: PartyStats; fetched: number };
export function Results() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [screenError, setScreenError] = useState('');
  const [revealed, setRevealed] = useState(true);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const [beers, stats] = await Promise.all([
          pb.collection('beer_results').getFullList<BeerResult>(),
          pb.collection('party_stats').getOne<PartyStats>('party_statistics'),
        ]);
        if (!stopped) {
          setSnapshot({
            beers: sortResults(beers),
            stats,
            fetched: Date.now(),
          });
          setError('');
        }
      } catch (e) {
        if (!stopped) setError(friendlyError(e));
      } finally {
        if (!stopped) timer = setTimeout(poll, 5000);
      }
    };
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, []);
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await panel.current?.requestFullscreen();
    } catch {
      setScreenError('Fullscreen is unavailable here. Use your browser’s fullscreen option.');
    }
  }
  const winner = snapshot?.beers.find((b) => b.rating_count > 0);
  return (
    <main className="page results-page" ref={panel}>
      <div className="results-heading">
        <div>
          <p className="eyebrow">THE PEOPLE HAVE GOOD TASTE</p>
          <h1>
            The beer hall favorites<span className="heading-star">✦</span>
          </h1>
          <p className="muted">Every sip counts. Here’s what’s winning over the table.</p>
        </div>
        <div className="results-tools">
          <Button variant="outline" onClick={() => setRevealed(!revealed)}>
            {revealed ? 'Hide rankings' : 'Reveal results'}
          </Button>
          <Button variant="outline" onClick={fullscreen} aria-label="Toggle fullscreen">
            <Maximize size={18} />
          </Button>
        </div>
      </div>
      <div className={`live-status ${error ? 'stale' : ''}`} role="status">
        <span className="status-dot" />
        {error
          ? snapshot
            ? `Connection paused · showing results from ${new Date(snapshot.fetched).toLocaleTimeString()}. Retrying automatically.`
            : 'Connecting to the beer hall… retrying automatically.'
          : 'LIVE FROM THE BEER HALL · UPDATES EVERY 5 SECONDS'}
      </div>
      {screenError && <ErrorMessage message={screenError} />}
      {!snapshot ? (
        error ? (
          <ErrorMessage message={error} />
        ) : (
          <Loading text="Counting the crowd’s favorites…" />
        )
      ) : (
        <>
          <div className="stats-grid">
            {[
              {
                Icon: Users,
                value: snapshot.stats.participants,
                label: 'TASTERS AT THE TABLE',
              },
              {
                Icon: Vote,
                value: snapshot.stats.total_ratings,
                label: 'SCORES POURED IN',
              },
              {
                Icon: Beer,
                value: snapshot.stats.beer_count,
                label: 'BEERS TO DISCOVER',
              },
            ].map(({ Icon, value, label }) => (
              <div className="stat" key={label}>
                <Icon size={23} />
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          {!revealed ? (
            <div className="reveal-screen">
              <Trophy size={58} />
              <h2>The suspense is brewing.</h2>
              <p>Keep sipping. The beer hall champion will be revealed soon.</p>
              <Button onClick={() => setRevealed(true)}>Reveal results</Button>
            </div>
          ) : (
            <div className="leaderboard-layout">
              <section className="leaderboard" aria-label="Beer leaderboard">
                <div className="leaderboard-title">
                  <h2>The leaderboard</h2>
                  <span>AVERAGE / 10</span>
                </div>
                {!snapshot.beers.length && (
                  <div className="empty-state">
                    <Beer size={32} />
                    <h3>The lineup is on its way.</h3>
                    <p>The host can add beers to get the tasting started.</p>
                  </div>
                )}
                {snapshot.beers.map((beer, i) => (
                  <article
                    className={`leaderboard-row ${i === 0 && beer.rating_count ? 'first-place' : ''}`}
                    key={beer.id}
                    data-testid={`result-${beer.name}`}
                  >
                    <span className="rank-number">
                      {beer.rating_count ? String(i + 1).padStart(2, '0') : '—'}
                    </span>
                    <div className="rank-details">
                      <h3>{beer.name}</h3>
                      <p>
                        {beer.brewery}
                        {beer.rating_count > 0 && beer.rating_count < 3 && (
                          <span className="provisional">Provisional</span>
                        )}
                      </p>
                      <div className="score-bar">
                        <span
                          style={{
                            width: `${beer.rating_count ? (beer.average_score ?? 0) * 10 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="rank-score">
                      <strong>
                        {beer.rating_count ? Number(beer.average_score).toFixed(1) : '—'}
                      </strong>
                      <span>
                        {beer.rating_count
                          ? `${beer.rating_count} ${beer.rating_count === 1 ? 'rating' : 'ratings'}`
                          : 'Not yet rated'}
                      </span>
                    </div>
                  </article>
                ))}
                <p className="leaderboard-footnote">
                  Averages settle as more tasters join in. Provisional = fewer than 3 ratings.
                </p>
              </section>
              <aside className="champion-panel">
                <Crown size={38} strokeWidth={1.3} />
                <p className="eyebrow light">
                  {winner ? 'THE CURRENT CROWD FAVORITE' : 'A CHAMPION IS WAITING'}
                </p>
                <h2>{winner ? winner.name : 'Your next pour could be the one.'}</h2>
                <p>{winner ? winner.brewery : 'Take a sip and cast the first score.'}</p>
                {winner ? (
                  <div className="champion-score">
                    {Number(winner.average_score).toFixed(1)}
                    <span>/ 10</span>
                  </div>
                ) : (
                  <Trophy className="champion-empty-icon" size={64} strokeWidth={1} />
                )}
                <div className="champion-ornament">✦ &nbsp; PROST! &nbsp; ✦</div>
                <p className="champion-note">
                  {winner && winner.rating_count < 3
                    ? 'An early favorite. The evening is still young.'
                    : 'Good beer brings people together.'}
                </p>
              </aside>
            </div>
          )}
        </>
      )}
    </main>
  );
}
