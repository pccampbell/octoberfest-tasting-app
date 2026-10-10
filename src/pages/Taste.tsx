import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  ArrowRight,
  Beer as BeerIcon,
  Check,
  CheckCircle2,
  ListFilter,
  Trophy,
} from 'lucide-react';
import { useSession } from '../lib/session';
import { pb, friendlyError, withGuest } from '../lib/pocketbase';
import type { Beer, Rating } from '../lib/types';
import { formatOrigin } from '../lib/utils';
import { BeerPoster, BeerLabel } from '../components/Illustration';
import { Button } from '../components/ui/button';
import { ErrorMessage, Loading } from '../components/Status';
import { RatingDialog } from '../components/RatingDialog';

type Filter = 'all' | 'untasted' | 'rated' | 'rankings';
export function Taste() {
  const session = useSession();
  const [beers, setBeers] = useState<Beer[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Beer | null>(null);
  const [notice, setNotice] = useState('');
  const [expandedNotes, setExpandedNotes] = useState<string[]>([]);
  const load = useCallback(async () => {
    try {
      const [lineup, mine] = await Promise.all([
        pb.collection('beers').getFullList<Beer>({ sort: 'sort_order,name' }),
        withGuest(() => pb.collection('ratings').getFullList<Rating>()),
      ]);
      setBeers(lineup);
      setRatings(mine);
      setError('');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, []);
  // load changes state only after the external PocketBase requests settle.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (session.guest) void load();
  }, [session.guest, load]);
  /* eslint-enable react-hooks/set-state-in-effect */
  if (session.loading)
    return (
      <main className="page">
        <Loading />
      </main>
    );
  if (session.error)
    return (
      <main className="page">
        <ErrorMessage message={session.error} retry={session.retry} />
      </main>
    );
  if (!session.guest) return <Navigate to="/join" replace />;
  const ratingFor = (id: string) => ratings.find((r) => r.beer === id);
  const tasted = beers.filter((b) => ratingFor(b.id)).length;
  const visible = beers.filter(
    (b) => filter === 'all' || (filter === 'untasted' ? !ratingFor(b.id) : ratingFor(b.id)),
  );
  if (filter === 'rankings')
    visible.sort(
      (a, b) => ratingFor(b.id)!.score - ratingFor(a.id)!.score || a.name.localeCompare(b.name),
    );
  function saved(rating: Rating) {
    setRatings((current) => [...current.filter((r) => r.beer !== rating.beer), rating]);
    setNotice(`Saved! ${selected?.name} · ${rating.score}/10`);
    setSelected(null);
    setExpandedNotes((current) => current.filter((id) => id !== rating.beer));
  }
  function toggleNotes(id: string) {
    setExpandedNotes((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }
  return (
    <main className="page tasting-page">
      <section className="tasting-hero">
        <div>
          <p className="eyebrow light">THE OKTOBERFEST TASTING TABLE</p>
          <h1>
            A sip of tradition.
            <br />
            <em>A taste of discovery.</em>
          </h1>
          <p>
            Make yourself at home, {session.guest.display_name}.<br />
            Find your pour, trust your taste, and discover your favorite.
          </p>
          <span className="hero-pill">
            <BeerIcon size={15} /> {beers.length} beers. One very good evening.
          </span>
        </div>
        <BeerPoster className="tasting-poster" />
        <div className="hero-corner top-left" />
        <div className="hero-corner bottom-right" />
      </section>
      <section className="progress-panel" aria-label="Your tasting progress">
        <span className="progress-icon">
          <CheckCircle2 size={24} />
        </span>
        <div className="progress-copy">
          <strong>Your tasting journey</strong>
          <span>
            {tasted === beers.length && beers.length
              ? 'Every pour explored. Time to pick your champion!'
              : 'Good things come one sip at a time.'}
          </span>
        </div>
        <div className="progress-right">
          <span>
            <strong>{tasted}</strong> of {beers.length} beers tasted
          </span>
          <progress max={beers.length || 1} value={tasted} />
        </div>
      </section>
      <section className="lineup-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              {filter === 'rankings' ? 'YOUR PERSONAL PODIUM' : 'MEET YOUR NEXT FAVORITE'}
            </p>
            <h2>
              {filter === 'rankings' ? 'My Rankings' : 'The beer lineup'}
              <span className="heading-star">✦</span>
            </h2>
          </div>
          <span className="lineup-caption">
            <ListFilter size={15} /> Sip at your own pace
          </span>
        </div>
        <div className="filter-tabs" role="group" aria-label="Beer filters">
          {(
            [
              ['all', 'All beers', beers.length],
              ['untasted', 'Not yet tasted', beers.length - tasted],
              ['rated', 'Already rated', tasted],
              ['rankings', 'My Rankings', tasted],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              aria-pressed={filter === id}
              className={filter === id ? 'active' : ''}
            >
              {id === 'rankings' && <Trophy size={15} />}
              {label}
              <span>{count}</span>
            </button>
          ))}
        </div>
        {notice && (
          <div className="saved-notice" role="status">
            <CheckCircle2 size={18} />
            {notice}
            <button onClick={() => setNotice('')} aria-label="Dismiss saved message">
              ×
            </button>
          </div>
        )}
        {error && <ErrorMessage message={error} retry={() => void load()} />}
        {loading ? (
          <Loading text="Bringing out the beer lineup…" />
        ) : !beers.length ? (
          <div className="empty-state">
            <BeerIcon size={36} />
            <h3>The taps are almost ready.</h3>
            <p>The host can add the evening’s beers in PocketBase. Check back in a moment.</p>
            <Button variant="outline" onClick={() => void load()}>
              Refresh lineup
            </Button>
          </div>
        ) : !visible.length ? (
          <div className="empty-state">
            <CheckCircle2 size={36} />
            <h3>
              {filter === 'untasted'
                ? 'You’ve explored every pour!'
                : 'Your first favorite awaits.'}
            </h3>
            <p>
              {filter === 'untasted'
                ? 'Head to My Rankings to revisit your favorites.'
                : 'Choose a beer from the lineup and give it a score.'}
            </p>
            <Button
              variant="outline"
              onClick={() => setFilter(filter === 'untasted' ? 'rankings' : 'all')}
            >
              {filter === 'untasted' ? 'My Rankings' : 'Explore the lineup'}
            </Button>
          </div>
        ) : (
          <div className="beer-grid">
            {visible.map((beer, position) => {
              const rating = ratingFor(beer.id);
              const index = beers.findIndex((b) => b.id === beer.id);
              const hasNotes = Boolean(rating?.notes.trim());
              const notesOpen = expandedNotes.includes(beer.id);
              return (
                <article
                  className={`beer-card ${rating ? 'is-rated' : ''} ${hasNotes ? 'has-notes' : ''}`}
                  key={beer.id}
                  onClick={
                    hasNotes
                      ? (e) => {
                          if (
                            window.matchMedia('(max-width: 680px)').matches &&
                            !(e.target as HTMLElement).closest('button, a, .mobile-rating-notes')
                          )
                            toggleNotes(beer.id);
                        }
                      : undefined
                  }
                >
                  <div className="beer-picture">
                    {beer.image ? (
                      <img
                        src={pb.files.getURL(beer, beer.image, {
                          thumb: '400x400',
                        })}
                        alt={`${beer.name} beer`}
                        loading="lazy"
                      />
                    ) : (
                      <BeerLabel index={index} name={beer.name} />
                    )}
                    <span className={`beer-status ${rating ? 'rated' : ''}`}>
                      {rating ? (
                        <>
                          <Check size={13} />
                          Tasted
                        </>
                      ) : (
                        'Waiting for a sip'
                      )}
                    </span>
                    {filter === 'rankings' && (
                      <span className="personal-rank">#{position + 1}</span>
                    )}
                  </div>
                  <div className="beer-card-body">
                    <div className="beer-details">
                      {beer.brewery && <p className="brewery">{beer.brewery}</p>}
                      <h3>{beer.name}</h3>
                      <div className="beer-meta">
                        <span>{beer.style || 'Beer'}</span>
                        {beer.abv > 0 && (
                          <>
                            <span className="meta-dot">•</span>
                            <span>{beer.abv}% ABV</span>
                          </>
                        )}
                      </div>
                      {beer.country && <p className="beer-origin">{formatOrigin(beer)}</p>}
                    </div>
                    {filter !== 'rankings' && beer.description && (
                      <p className="beer-description">{beer.description}</p>
                    )}
                    {rating && (
                      <div className="my-rating">
                        <span>
                          <span className="rating-caption">Your score </span>
                          <strong>
                            {rating.score}
                            <small>/10</small>
                          </strong>
                        </span>
                        {rating.notes && <p>{rating.notes}</p>}
                      </div>
                    )}
                    <div className="beer-actions">
                      <Button
                        variant={rating ? 'outline' : 'default'}
                        className="full-width rate-button"
                        onClick={() => setSelected(beer)}
                        aria-label={`${rating ? 'Edit rating for' : 'Rate'} ${beer.name}`}
                      >
                        <span className="rate-label">
                          {rating ? 'Revisit your rating' : 'Taste & rate'}
                        </span>
                        <span className="rate-label-short">{rating ? 'Edit' : 'Rate'}</span>
                        <ArrowRight size={16} />
                      </Button>
                      {hasNotes && (
                        <button
                          className="notes-toggle"
                          type="button"
                          aria-label={`${notesOpen ? 'Hide' : 'Show'} notes for ${beer.name}`}
                          aria-expanded={notesOpen}
                          aria-controls={`notes-${beer.id}`}
                          onClick={() => toggleNotes(beer.id)}
                        />
                      )}
                    </div>
                  </div>
                  {hasNotes && (
                    <p className="mobile-rating-notes" id={`notes-${beer.id}`} hidden={!notesOpen}>
                      {rating!.notes}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
      <div className="tasting-tip">
        <span>✦</span>
        <p>There’s no wrong favorite. Just the one you’d pour again.</p>
        <span>✦</span>
      </div>
      {selected && (
        <RatingDialog
          key={selected.id}
          beer={selected}
          rating={ratingFor(selected.id)}
          close={() => setSelected(null)}
          saved={saved}
          removed={(id) => {
            setRatings((current) => current.filter((r) => r.id !== id));
            setNotice('Rating cleared. Ready for a fresh sip.');
            setSelected(null);
            setExpandedNotes((current) => current.filter((id) => id !== selected?.id));
          }}
        />
      )}
    </main>
  );
}
